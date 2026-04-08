from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx

from ...config import settings
from .providers import AIProvider, AIResponse


class OllamaProvider(AIProvider):
    def __init__(self, provider_id: str, name: str, model: str, cost_per_session: str, cost_raw: int):
        self.id = provider_id
        self.name = name
        self.model = model
        self.cost_per_session = cost_per_session
        self.cost_raw = cost_raw
        self.tier = "free"
        self.capabilities = ["private therapist chat", "daily insights", "pattern synthesis"]

    @property
    def is_available(self) -> bool:
        return bool(settings.OLLAMA_BASE_URL and (settings.LOCAL_CHAT_MODEL or settings.LOCAL_QWEN_MODEL))

    def _model_name(self, model_override: str | None = None) -> str:
        return model_override or settings.THERAPIST_DEFAULT_MODEL or settings.LOCAL_CHAT_MODEL or settings.LOCAL_QWEN_MODEL or self.model

    def _messages_payload(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str) -> list[dict[str, str]]:
        return [
            {"role": "system", "content": system_prompt},
            *[
                {"role": item["role"] if item["role"] in {"user", "assistant"} else "user", "content": item["content"]}
                for item in conversation_history
            ],
            {"role": "user", "content": message},
        ]

    def _base_payload(self, model_name: str) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model_name,
            "think": settings.OLLAMA_THINK,
            "options": {
                "temperature": 0.35,
                "num_ctx": settings.OLLAMA_NUM_CTX,
            },
        }
        if settings.OLLAMA_KEEP_ALIVE:
            payload["keep_alive"] = settings.OLLAMA_KEEP_ALIVE
        return payload

    async def prewarm(self, model_override: str | None = None) -> None:
        model_name = self._model_name(model_override)
        payload = self._base_payload(model_name)
        payload.update(
            {
                "stream": False,
                "prompt": "",
                "keep_alive": settings.OLLAMA_KEEP_ALIVE or "8h",
                "options": {
                    **payload["options"],
                    "num_predict": 0,
                },
            }
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate",
                json=payload,
            )
            response.raise_for_status()

    async def send_message(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str, model_override: str | None = None) -> AIResponse:
        model_name = self._model_name(model_override)
        payload = self._base_payload(model_name)
        payload.update({
            "stream": False,
            "messages": self._messages_payload(message, conversation_history, system_prompt),
        })
        async with httpx.AsyncClient(timeout=float(settings.OLLAMA_REQUEST_TIMEOUT_SECONDS)) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        message_payload = body.get("message") or {}
        content = (message_payload.get("content") or "").strip()
        if not content:
            raise RuntimeError("Ollama returned an empty response")

        prompt_tokens = int(body.get("prompt_eval_count") or 0)
        completion_tokens = int(body.get("eval_count") or 0)

        frameworks: list[str] = []
        if "\"frameworks\"" in content:
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict):
                    content = str(parsed.get("content") or parsed.get("message") or content).strip()
                    value = parsed.get("frameworks") or []
                    if isinstance(value, list):
                        frameworks = [str(item) for item in value]
            except json.JSONDecodeError:
                frameworks = []

        return AIResponse(
            content=content,
            provider=self.id,
            model=model_name,
            tokens_used=prompt_tokens + completion_tokens,
            cost_pence=self.cost_raw,
            frameworks_referenced=frameworks,
        )

    async def stream_message(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        system_prompt: str,
        model_override: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        model_name = self._model_name(model_override)
        payload = self._base_payload(model_name)
        payload.update({
            "stream": True,
            "messages": self._messages_payload(message, conversation_history, system_prompt),
        })
        async with httpx.AsyncClient(timeout=float(settings.OLLAMA_REQUEST_TIMEOUT_SECONDS)) as client:
            async with client.stream(
                "POST",
                f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    body = json.loads(line)
                    message_payload = body.get("message") or {}
                    delta = message_payload.get("content") or ""
                    if delta:
                        yield {"delta": delta}
                    if body.get("done"):
                        yield {
                            "done": True,
                            "provider": self.id,
                            "model": model_name,
                            "tokens_used": int(body.get("prompt_eval_count") or 0) + int(body.get("eval_count") or 0),
                            "cost_pence": self.cost_raw,
                            "frameworks_referenced": [],
                        }

    async def list_models(self) -> list[str]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags")
            response.raise_for_status()
            payload = response.json()
        models = payload.get("models") or []
        names = [str(item.get("name")) for item in models if item.get("name")]
        if not names:
            fallback = self._model_name()
            return [fallback] if fallback else []
        return names
