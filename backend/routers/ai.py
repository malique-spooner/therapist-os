from datetime import datetime
import os
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.logging import get_logger
from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import AIConversation, AIMessage, MonthlyBudget
from ..schemas.ai import AIResponseSchema, ConversationSchema, LiveSessionSchema, MessageRequestSchema, OpeningMessageSchema, ProviderSchema, TranscriptionSchema
from ..config import settings
from ..services.ai.context_builder import ContextBuilder
from ..services.ai.providers import provider_payloads, select_provider
from ..services.whisper_service import WhisperService

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(verify_api_key)])
context_builder = ContextBuilder()
whisper_service = WhisperService()
logger = get_logger(__name__)


def _infer_frameworks(content: str) -> list[str]:
    lower = content.lower()
    frameworks: list[str] = []
    if "cbt" in lower or "thought" in lower:
        frameworks.append("CBT")
    if "self-determination" in lower or "autonomy" in lower or "relatedness" in lower or "competence" in lower or "sdt" in lower:
        frameworks.append("SDT")
    if "behaviourism" in lower or "reinforcement" in lower or "reward" in lower or "pattern" in lower:
        frameworks.append("Behaviourism")
    return frameworks


def _serialize_message(message: AIMessage) -> dict:
    return {
        "id": message.id,
        "role": "ai" if message.role == "assistant" else message.role,
        "content": message.content,
        "createdAt": message.created_at.isoformat(),
        "frameworksReferenced": message.frameworks_referenced or [],
        "costPence": message.cost_pence or 0,
    }


def _serialize_conversation(conversation: AIConversation) -> dict:
    ordered_messages = sorted(conversation.messages, key=lambda item: item.created_at)
    return {
        "id": conversation.id,
        "startedAt": conversation.started_at.isoformat(),
        "endedAt": conversation.ended_at.isoformat() if conversation.ended_at else None,
        "sessionType": conversation.session_type,
        "provider": conversation.ai_provider,
        "model": conversation.ai_model,
        "totalTokensUsed": conversation.total_tokens_used,
        "totalCostPence": conversation.total_cost_pence,
        "messages": [_serialize_message(message) for message in ordered_messages],
    }


async def _mint_openai_client_secret(system_prompt: str) -> dict:
    payload = {
        "session": {
            "type": "realtime",
            "model": "gpt-realtime",
            "instructions": system_prompt,
            "audio": {
                "input": {
                    "transcription": {
                        "model": "whisper-1",
                    }
                },
                "output": {
                    "voice": "alloy",
                },
            },
        },
        "expires_after": {
            "seconds": 600,
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        return response.json()


def _current_budget(db: Session) -> MonthlyBudget:
    month = datetime.utcnow().date().replace(day=1)
    budget = db.scalar(select(MonthlyBudget).where(MonthlyBudget.month == month))
    if not budget:
        budget = MonthlyBudget(month=month)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget


@router.get("/providers", response_model=list[ProviderSchema])
def get_providers() -> list[dict]:
    return provider_payloads()


@router.get("/opening-message", response_model=OpeningMessageSchema)
async def get_opening_message(db: Session = Depends(get_db)) -> dict:
    return {"message": await context_builder.generate_opening_message(db)}


@router.get("/conversations", response_model=list[ConversationSchema])
def get_conversations(db: Session = Depends(get_db)) -> list[dict]:
    conversations = db.scalars(select(AIConversation).order_by(AIConversation.started_at.desc())).all()
    for conversation in conversations:
        conversation.messages
    return [_serialize_conversation(conversation) for conversation in conversations]


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)) -> dict:
    conversation = db.get(AIConversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation.messages
    return _serialize_conversation(conversation)


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db)) -> list[dict]:
    conversation = db.get(AIConversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    ordered_messages = sorted(conversation.messages, key=lambda item: item.created_at)
    return [_serialize_message(message) for message in ordered_messages]


@router.post("/conversations")
def start_conversation(payload: dict | None = None, db: Session = Depends(get_db)) -> dict:
    provider_id = (payload or {}).get("provider", "claude-sonnet")
    provider = select_provider(provider_id)
    conversation = AIConversation(ai_provider=provider.id, ai_model=provider.model, session_type="async")
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return {"id": conversation.id}


@router.put("/conversations/{conversation_id}/end")
def end_conversation(conversation_id: str, db: Session = Depends(get_db)) -> dict:
    conversation = db.get(AIConversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation.ended_at = datetime.utcnow()
    db.commit()
    return {"detail": "Conversation ended"}


@router.post("/message", response_model=AIResponseSchema)
async def send_message(payload: MessageRequestSchema, db: Session = Depends(get_db)) -> dict:
    provider = select_provider(payload.provider)
    conversation = db.get(AIConversation, payload.conversation_id) if payload.conversation_id else None
    if not conversation:
        conversation = AIConversation(ai_provider=provider.id, ai_model=provider.model, session_type="async")
        db.add(conversation)
        db.flush()

    user_message = AIMessage(conversation_id=conversation.id, role="user", content=payload.message, source="text_input", cost_pence=0)
    db.add(user_message)
    db.flush()

    history = [{"role": msg.role, "content": msg.content} for msg in sorted(conversation.messages, key=lambda item: item.created_at)]
    system_prompt = await context_builder.build_system_prompt(db)
    try:
        response = await provider.send_message(payload.message, history, system_prompt)
    except Exception as exc:
        logger.exception(
            "ai_provider_failure",
            extra={
                "event": "ai_provider_failure",
                "extra_data": {
                    "provider": provider.id,
                    "conversation_id": conversation.id,
                },
            },
        )
        raise HTTPException(status_code=502, detail=f"AI provider error: {exc.__class__.__name__}") from exc
    frameworks = response.frameworks_referenced or _infer_frameworks(response.content)

    assistant_message = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=response.content,
        source="text_input",
        tokens_used=response.tokens_used,
        cost_pence=response.cost_pence,
        frameworks_referenced=frameworks,
    )
    db.add(assistant_message)

    conversation.total_tokens_used += response.tokens_used
    conversation.total_cost_pence += response.cost_pence
    conversation.ai_provider = response.provider
    conversation.ai_model = response.model

    budget = _current_budget(db)
    budget.spent_pence += response.cost_pence

    db.commit()

    return {
        "content": response.content,
        "provider": response.provider,
        "model": response.model,
        "tokensUsed": response.tokens_used,
        "costPence": response.cost_pence,
        "frameworksReferenced": frameworks,
        "conversationId": conversation.id,
        "sessionCostPence": conversation.total_cost_pence,
    }


@router.post("/transcribe", response_model=TranscriptionSchema)
async def transcribe_audio(audio: UploadFile = File(...)) -> dict:
    suffix = os.path.splitext(audio.filename or "recording.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await audio.read()
        tmp.write(content)

    try:
        text = await whisper_service.transcribe(tmp_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        try:
            os.remove(tmp_path)
        except FileNotFoundError:
            pass

    return {"text": text}


@router.post("/live/session", response_model=LiveSessionSchema)
async def create_live_session(db: Session = Depends(get_db)) -> dict:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI live mode is not configured")

    system_prompt = await context_builder.build_system_prompt(db)

    try:
        session = await _mint_openai_client_secret(system_prompt)
    except Exception as exc:
        logger.exception(
            "openai_live_session_failure",
            extra={"event": "openai_live_session_failure", "extra_data": {}},
        )
        raise HTTPException(status_code=502, detail=f"OpenAI live session error: {exc.__class__.__name__}") from exc

    return {
        "clientSecret": session["value"],
        "model": "gpt-realtime",
        "voice": "alloy",
        "estimatedCostPerMinutePence": 6,
        "warning": "Live mode uses OpenAI Realtime and costs about 6 pence per minute.",
    }
