from sqlalchemy import select

from backend.routers import ai as ai_router
from backend.config import settings
from backend.models.life_data import AIConversationReal, AIMessageReal, MonthlyBudgetReal
from backend.services.ai.providers import AIResponse


def test_ai_message_creates_conversation_and_updates_budget(client, db_session, monkeypatch):
    start_budget_row = db_session.scalar(select(MonthlyBudgetReal).limit(1))
    start_budget = start_budget_row.spent_pence if start_budget_row else 0

    class FakeProvider:
        id = "claude-sonnet"
        name = "Claude Sonnet"
        model = "claude-sonnet-test"

        async def send_message(self, message, conversation_history, system_prompt, model_override=None):
            return AIResponse(
                content=f"Replying to: {message}",
                provider=self.id,
                model=model_override or self.model,
                tokens_used=max(1, len(conversation_history) + len(system_prompt)),
                cost_pence=8,
                frameworks_referenced=["CBT"],
            )

    monkeypatch.setattr(ai_router, "has_real_provider", lambda provider_id: provider_id == "claude-sonnet")
    monkeypatch.setattr(ai_router, "select_provider", lambda provider_id: FakeProvider() if provider_id == "claude-sonnet" else ai_router.REAL_PROVIDERS["local-qwen"])

    response = client.post(
        "/api/ai/message?mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
        json={"message": "I've been anxious about my spending lately", "provider": "claude-sonnet"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["content"]
    assert payload["conversationId"]
    assert payload["costPence"] >= 0
    assert isinstance(payload["frameworksReferenced"], list)

    conversations = db_session.scalars(select(AIConversationReal)).all()
    assert conversations
    updated_budget = db_session.scalar(select(MonthlyBudgetReal).limit(1)).spent_pence
    assert updated_budget >= start_budget


def test_ai_message_requires_real_provider_availability(client, monkeypatch):
    monkeypatch.setattr(ai_router, "has_real_provider", lambda _provider_id: False)

    response = client.post(
        "/api/ai/message?mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
        json={"message": "test", "provider": "claude-sonnet"},
    )

    assert response.status_code == 503
    assert "not available" in response.json()["detail"]


def test_ai_message_stream_persists_messages_for_existing_conversation(client, db_session, monkeypatch):
    class FakeStreamProvider:
        id = "claude-sonnet"
        name = "Claude Sonnet"
        model = "claude-sonnet-test"

        async def stream_message(self, message, conversation_history, system_prompt, model_override=None):
            assert message == "Stream me a reply"
            assert isinstance(conversation_history, list)
            assert isinstance(system_prompt, str)
            yield {"delta": "Hello"}
            yield {"delta": " there"}
            yield {
                "done": True,
                "tokens_used": 12,
                "cost_pence": 5,
                "frameworks_referenced": ["CBT"],
                "model": model_override or self.model,
            }

    monkeypatch.setattr(ai_router, "has_real_provider", lambda provider_id: provider_id == "claude-sonnet")
    monkeypatch.setattr(ai_router, "select_provider", lambda provider_id: FakeStreamProvider() if provider_id == "claude-sonnet" else ai_router.REAL_PROVIDERS["local-qwen"])

    start_response = client.post(
        "/api/ai/conversations?mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
        json={"provider": "claude-sonnet"},
    )
    assert start_response.status_code == 200
    conversation_id = start_response.json()["id"]

    response = client.post(
        "/api/ai/message/stream?mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
        json={"message": "Stream me a reply", "provider": "claude-sonnet", "conversation_id": conversation_id},
    )

    assert response.status_code == 200
    body = response.text
    assert '"type": "delta"' in body
    assert '"type": "done"' in body

    conversation = db_session.scalar(select(AIConversationReal).order_by(AIConversationReal.started_at.desc()))
    assert conversation is not None
    messages = db_session.scalars(select(AIMessageReal).where(AIMessageReal.conversation_id == conversation.id).order_by(AIMessageReal.created_at)).all()
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"
    assert messages[1].content == "Hello there"


def test_ai_message_stream_requires_existing_conversation(client, monkeypatch):
    monkeypatch.setattr(ai_router, "has_real_provider", lambda provider_id: provider_id == "claude-sonnet")

    response = client.post(
        "/api/ai/message/stream?mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
        json={"message": "Stream me a reply", "provider": "claude-sonnet"},
    )

    assert response.status_code == 400
    assert "Start a conversation first" in response.json()["detail"]


def test_ai_transcribe_returns_text(client, monkeypatch):
    async def fake_transcribe(_path: str) -> str:
        return "This is a transcribed voice note"

    monkeypatch.setattr(ai_router.whisper_service, "transcribe", fake_transcribe)

    response = client.post(
        "/api/ai/transcribe",
        headers={"X-API-Key": "dev-secret-key"},
        files={"audio": ("recording.webm", b"fake-audio", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "This is a transcribed voice note"}


def test_ai_transcribe_surfaces_runtime_errors(client, monkeypatch):
    async def fake_transcribe(_path: str) -> str:
        raise RuntimeError("Whisper transcription is not available in this environment")

    monkeypatch.setattr(ai_router.whisper_service, "transcribe", fake_transcribe)

    response = client.post(
        "/api/ai/transcribe",
        headers={"X-API-Key": "dev-secret-key"},
        files={"audio": ("recording.webm", b"fake-audio", "audio/webm")},
    )

    assert response.status_code == 400
    assert "Whisper transcription" in response.json()["detail"]


def test_ai_tts_returns_audio(client, monkeypatch):
    async def fake_synthesize(text: str, provider=None, voice=None) -> bytes:
        assert text == "Hello there"
        assert provider == "kokoro"
        assert voice == "af_heart"
        return b"RIFFfakewav"

    monkeypatch.setattr(ai_router.tts_service, "synthesize", fake_synthesize)

    response = client.post(
        "/api/ai/tts",
        headers={"X-API-Key": "dev-secret-key"},
        json={"text": "Hello there", "provider": "kokoro", "voice": "af_heart"},
    )

    assert response.status_code == 200
    assert response.content == b"RIFFfakewav"
    assert response.headers["content-type"] == "audio/wav"


def test_ai_tts_surfaces_runtime_errors(client, monkeypatch):
    async def fake_synthesize(_text: str, provider=None, voice=None) -> bytes:
        raise RuntimeError("Piper synthesis failed")

    monkeypatch.setattr(ai_router.tts_service, "synthesize", fake_synthesize)

    response = client.post(
        "/api/ai/tts",
        headers={"X-API-Key": "dev-secret-key"},
        json={"text": "Hello there"},
    )

    assert response.status_code == 503
    assert "Piper synthesis failed" in response.json()["detail"]


def test_ai_live_session_returns_ephemeral_credentials(client, monkeypatch):
    captured = {}

    async def fake_system_prompt(_db, *_args, **_kwargs):
        captured["mode"] = _args[0] if _args else _kwargs.get("mode")
        return "System prompt"

    async def fake_mint(_system_prompt: str):
        return {"value": "live-secret-123"}

    monkeypatch.setattr(ai_router, "_mint_openai_client_secret", fake_mint)
    monkeypatch.setattr(ai_router.context_builder, "build_system_prompt", fake_system_prompt)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-openai-key")

    response = client.post("/api/ai/live/session?mode=demo-only", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json()["clientSecret"] == "live-secret-123"
    assert response.json()["estimatedCostPerMinutePence"] == 6
    assert captured["mode"] == "demo-only"


def test_ai_live_session_requires_openai_configuration(client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

    response = client.post("/api/ai/live/session", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
