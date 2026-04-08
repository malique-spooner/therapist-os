from backend.config import settings
from backend.services.ai.ollama import OllamaProvider


class DummyResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class DummyClient:
    def __init__(self, payload: dict, expected_model: str):
        self.payload = payload
        self.expected_model = expected_model

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url: str, json: dict):
        assert url.endswith("/api/chat")
        assert json["model"] == self.expected_model
        assert json["think"] is False
        assert json["options"]["num_ctx"] == 8192
        return DummyResponse(self.payload)


async def test_ollama_provider_parses_chat_response(monkeypatch):
    monkeypatch.setattr(settings, "THERAPIST_DEFAULT_MODEL", "qwen2.5:3b")
    monkeypatch.setattr(
        "backend.services.ai.ollama.httpx.AsyncClient",
        lambda timeout: DummyClient(
            {
                "message": {"content": "A grounded, local response."},
                "prompt_eval_count": 42,
                "eval_count": 18,
            },
            expected_model="qwen2.5:3b",
        ),
    )
    provider = OllamaProvider("local-qwen", "Local Mind", "qwen3.5:35b", "Private on Mac", 0)
    response = await provider.send_message("hello", [], "system")
    assert response.content == "A grounded, local response."
    assert response.provider == "local-qwen"
    assert response.model == "qwen2.5:3b"
    assert response.tokens_used == 60
