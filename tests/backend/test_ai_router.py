from sqlalchemy import select

from backend.routers import ai as ai_router
from backend.config import settings
from backend.models import AIConversation, MonthlyBudget


def test_ai_message_creates_conversation_and_updates_budget(client, db_session):
    start_budget = db_session.scalar(select(MonthlyBudget).limit(1)).spent_pence

    response = client.post(
        "/api/ai/message",
        headers={"X-API-Key": "dev-secret-key"},
        json={"message": "I've been anxious about my spending lately", "provider": "claude-sonnet"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["content"]
    assert payload["conversationId"]
    assert payload["costPence"] >= 0
    assert isinstance(payload["frameworksReferenced"], list)

    conversations = db_session.scalars(select(AIConversation)).all()
    assert conversations
    updated_budget = db_session.scalar(select(MonthlyBudget).limit(1)).spent_pence
    assert updated_budget >= start_budget


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


def test_ai_live_session_returns_ephemeral_credentials(client, monkeypatch):
    async def fake_system_prompt(_db):
        return "System prompt"

    async def fake_mint(_system_prompt: str):
        return {"value": "live-secret-123"}

    monkeypatch.setattr(ai_router, "_mint_openai_client_secret", fake_mint)
    monkeypatch.setattr(ai_router.context_builder, "build_system_prompt", fake_system_prompt)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-openai-key")

    response = client.post("/api/ai/live/session", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json()["clientSecret"] == "live-secret-123"
    assert response.json()["estimatedCostPerMinutePence"] == 6


def test_ai_live_session_requires_openai_configuration(client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

    response = client.post("/api/ai/live/session", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
