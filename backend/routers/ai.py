from datetime import datetime
import json
import os
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
import httpx
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.logging import get_logger
from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import (
    AIConversationDemo,
    AIConversationReal,
    AIMessageDemo,
    AIMessageReal,
    MonthlyBudgetDemo,
    MonthlyBudgetReal,
)
from ..schemas.ai import AIResponseSchema, AIRuntimeOptionsSchema, ConversationSchema, ConversationCreateSchema, ConversationStartSchema, LiveSessionSchema, MessageRequestSchema, OpeningMessageSchema, ProviderSchema, TTSRequestSchema, TranscriptionSchema
from ..config import settings
from ..services.ai.context_builder import ContextBuilder
from ..services.data_mode import dataset_model, demo_filter, normalize_data_mode
from ..services.ai.providers import REAL_PROVIDERS, has_real_provider, provider_payloads, select_provider
from ..services.data_sources import DataSourceService
from ..services.whisper_service import WhisperService
from ..services.tts_service import KOKORO_VOICES, TherapistTTSService

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(verify_api_key)])
context_builder = ContextBuilder()
whisper_service = WhisperService()
tts_service = TherapistTTSService()
data_source_service = DataSourceService()
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


def _conversation_models(mode: str | None = None):
    return AIConversationReal, AIMessageReal


def _serialize_message(message: AIMessageReal | AIMessageDemo) -> dict:
    return {
        "id": message.id,
        "role": "ai" if message.role == "assistant" else message.role,
        "content": message.content,
        "createdAt": message.created_at.isoformat(),
        "frameworksReferenced": message.frameworks_referenced or [],
        "costPence": message.cost_pence or 0,
    }


def _serialize_conversation(conversation: AIConversationReal | AIConversationDemo) -> dict:
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


def _require_provider(provider_id: str) -> None:
    provider = REAL_PROVIDERS.get(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Unknown AI provider")
    if has_real_provider(provider_id):
        return
    if provider_id == "local-qwen":
        raise HTTPException(
            status_code=503,
            detail="Local Ollama model is not available. Check OLLAMA_BASE_URL, LOCAL_QWEN_MODEL, and that Ollama is running.",
        )
    raise HTTPException(
        status_code=503,
        detail=f"{provider.name} is not available in this environment.",
    )


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


def _current_budget(db: Session, mode: str | None = None):
    normalized_mode = normalize_data_mode(mode)
    budget_model = dataset_model(normalized_mode, MonthlyBudgetReal, MonthlyBudgetDemo)
    month = datetime.utcnow().date().replace(day=1)
    budget = db.scalar(select(budget_model).where(budget_model.month == month))
    if not budget:
        budget = budget_model(month=month)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget


@router.get("/providers", response_model=list[ProviderSchema])
def get_providers() -> list[dict]:
    return provider_payloads()


@router.get("/runtime-options", response_model=AIRuntimeOptionsSchema)
async def get_runtime_options(db: Session = Depends(get_db)) -> dict:
    provider = REAL_PROVIDERS["local-qwen"]
    local_models = [settings.THERAPIST_DEFAULT_MODEL]
    if hasattr(provider, "list_models"):
        try:
            local_models = await provider.list_models()
        except Exception:
            local_models = [settings.THERAPIST_DEFAULT_MODEL]

    if settings.THERAPIST_DEFAULT_MODEL not in local_models:
        local_models = [settings.THERAPIST_DEFAULT_MODEL, *local_models]

    return {
        "localModels": local_models,
        "defaultModel": settings.THERAPIST_DEFAULT_MODEL,
        "ttsProviders": ["kokoro", "piper"],
        "defaultTtsProvider": settings.THERAPIST_DEFAULT_TTS_PROVIDER,
        "defaultTtsVoice": settings.THERAPIST_DEFAULT_TTS_VOICE,
        "ttsVoices": {
            "kokoro": KOKORO_VOICES,
            "piper": ["en_US-lessac-medium"],
        },
        "googleMapsApiKey": data_source_service.get_runtime_config("google_maps", db).get("api_key"),
    }


@router.get("/opening-message", response_model=OpeningMessageSchema)
async def get_opening_message(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    return {"message": await context_builder.generate_opening_message(db, mode)}


@router.get("/conversations", response_model=list[ConversationSchema])
def get_conversations(mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    conversation_model, _ = _conversation_models(mode)
    conversations = db.scalars(select(conversation_model).order_by(conversation_model.started_at.desc())).all()
    for conversation in conversations:
        conversation.messages
    return [_serialize_conversation(conversation) for conversation in conversations]


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
def get_conversation(conversation_id: str, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    conversation_model, _ = _conversation_models(mode)
    conversation = db.scalar(select(conversation_model).where(conversation_model.id == conversation_id))
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation.messages
    return _serialize_conversation(conversation)


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str, mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    conversation_model, _ = _conversation_models(mode)
    conversation = db.scalar(select(conversation_model).where(conversation_model.id == conversation_id))
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    ordered_messages = sorted(conversation.messages, key=lambda item: item.created_at)
    return [_serialize_message(message) for message in ordered_messages]


@router.post("/conversations", response_model=ConversationStartSchema)
async def start_conversation(payload: ConversationCreateSchema | None = None, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    conversation_model, _ = _conversation_models(mode)
    provider_id = (payload.provider if payload else None) or "local-qwen"
    _require_provider(provider_id)
    provider = select_provider(provider_id)
    conversation = conversation_model(
        ai_provider=provider.id,
        ai_model=payload.model if payload and payload.model else getattr(provider, "_model_name", lambda: provider.model)(),
        session_type="async",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return {"id": conversation.id, "openingMessage": None}


@router.put("/conversations/{conversation_id}/end")
def end_conversation(conversation_id: str, db: Session = Depends(get_db)) -> dict:
    conversation = db.get(AIConversationReal, conversation_id) or db.get(AIConversationDemo, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation.ended_at = datetime.utcnow()
    db.commit()
    return {"detail": "Conversation ended"}


@router.post("/message", response_model=AIResponseSchema)
async def send_message(payload: MessageRequestSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    conversation_model, message_model = _conversation_models(mode)
    _require_provider(payload.provider)
    provider = select_provider(payload.provider)
    conversation = (
        db.scalar(select(conversation_model).where(conversation_model.id == payload.conversation_id))
        if payload.conversation_id
        else None
    )
    if not conversation:
        conversation = conversation_model(
            ai_provider=provider.id,
            ai_model=provider.model,
            session_type="async",
        )
        db.add(conversation)
        db.flush()

    prior_history = [{"role": msg.role, "content": msg.content} for msg in sorted(conversation.messages, key=lambda item: item.created_at)]
    user_message = message_model(role="user", content=payload.message, source="text_input", cost_pence=0)
    conversation.messages.append(user_message)
    db.flush()

    system_prompt = await context_builder.build_system_prompt(db, mode)
    try:
        response = await provider.send_message(payload.message, prior_history, system_prompt, model_override=payload.model)
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

    assistant_message = message_model(
        conversation_id=conversation.id,
        role="assistant",
        content=response.content,
        source="text_input",
        tokens_used=response.tokens_used,
        cost_pence=response.cost_pence,
        frameworks_referenced=frameworks,
    )
    conversation.messages.append(assistant_message)

    conversation.total_tokens_used += response.tokens_used
    conversation.total_cost_pence += response.cost_pence
    conversation.ai_provider = response.provider
    conversation.ai_model = response.model

    budget = _current_budget(db, mode)
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


@router.post("/message/stream")
async def stream_message(payload: MessageRequestSchema, mode: str | None = None, db: Session = Depends(get_db)) -> StreamingResponse:
    conversation_model, message_model = _conversation_models(mode)
    if not payload.conversation_id:
        raise HTTPException(status_code=400, detail="Streaming requires an existing conversation. Start a conversation first.")
    _require_provider(payload.provider)
    provider = select_provider(payload.provider)
    conversation = (
        db.scalar(select(conversation_model).where(conversation_model.id == payload.conversation_id))
        if payload.conversation_id
        else None
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    prior_history = [{"role": msg.role, "content": msg.content} for msg in sorted(conversation.messages, key=lambda item: item.created_at)]
    user_message = message_model(role="user", content=payload.message, source="text_input", cost_pence=0)
    conversation.messages.append(user_message)
    db.commit()
    db.refresh(conversation)
    db.refresh(user_message)
    system_prompt = await context_builder.build_system_prompt(db, mode)

    async def generate():
        accumulated = ""
        tokens_used = 0
        cost_pence = 0
        frameworks: list[str] = []
        final_model = payload.model or provider.model
        try:
            async for chunk in provider.stream_message(payload.message, prior_history, system_prompt, model_override=payload.model):
                delta = str(chunk.get("delta") or "")
                if delta:
                    accumulated += delta
                    yield json.dumps({"type": "delta", "content": delta}) + "\n"
                if chunk.get("done"):
                    tokens_used = int(chunk.get("tokens_used") or 0)
                    cost_pence = int(chunk.get("cost_pence") or 0)
                    frameworks = [str(item) for item in (chunk.get("frameworks_referenced") or [])]
                    final_model = str(chunk.get("model") or final_model)

            frameworks = frameworks or _infer_frameworks(accumulated)
            ai_message = message_model(
                conversation_id=conversation.id,
                role="assistant",
                content=accumulated.strip(),
                source=provider.id,
                frameworks_referenced=frameworks,
                tokens_used=tokens_used,
                cost_pence=cost_pence,
            )
            db.add(ai_message)
            persisted_conversation = db.scalar(select(conversation_model).where(conversation_model.id == conversation.id))
            if not persisted_conversation:
                raise RuntimeError("Conversation not found while saving streamed response")
            persisted_conversation.total_tokens_used += tokens_used
            persisted_conversation.total_cost_pence += cost_pence
            persisted_conversation.ai_provider = provider.id
            persisted_conversation.ai_model = final_model
            budget = _current_budget(db, mode)
            budget.spent_pence += cost_pence
            db.commit()
            yield json.dumps({
                "type": "done",
                "conversationId": persisted_conversation.id,
                "sessionCostPence": persisted_conversation.total_cost_pence,
                "costPence": cost_pence,
                "frameworksReferenced": frameworks,
                "model": final_model,
            }) + "\n"
        except Exception as exc:
            db.rollback()
            logger.exception(
                "ai_provider_stream_failure",
                extra={
                    "event": "ai_provider_stream_failure",
                    "extra_data": {"provider": provider.id, "conversation_id": conversation.id},
                },
            )
            yield json.dumps({"type": "error", "detail": str(exc)}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


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


@router.post("/tts")
async def synthesize_speech(payload: TTSRequestSchema) -> Response:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for speech synthesis")

    try:
        audio_bytes = await tts_service.synthesize(text, provider=payload.provider, voice=payload.voice)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(content=audio_bytes, media_type="audio/wav")


@router.post("/live/session", response_model=LiveSessionSchema)
async def create_live_session(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI live mode is not configured")

    system_prompt = await context_builder.build_system_prompt(db, mode)

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
