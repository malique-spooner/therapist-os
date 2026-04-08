from __future__ import annotations

import google.generativeai as genai

from ...config import settings
from .providers import AIProvider, AIResponse


class GoogleProvider(AIProvider):
    def __init__(self, provider_id: str, name: str, model: str, cost_per_session: str, cost_raw: int):
        self.id = provider_id
        self.name = name
        self.model = model
        self.cost_per_session = cost_per_session
        self.cost_raw = cost_raw
        self.tier = "free"
        self.capabilities = ["fast", "good quality"]
        genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
        self._model = genai.GenerativeModel(model)

    @property
    def is_available(self) -> bool:
        return bool(settings.GOOGLE_AI_API_KEY)

    async def send_message(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str, model_override: str | None = None) -> AIResponse:
        model_name = model_override or self.model
        model = self._model if model_name == self.model else genai.GenerativeModel(model_name)
        chat = model.start_chat(history=[{"role": "user" if item["role"] != "assistant" else "model", "parts": [item["content"]]} for item in conversation_history])
        response = await chat.send_message_async(f"{system_prompt}\n\nUser message:\n{message}")
        usage = getattr(response, "usage_metadata", None)
        tokens_used = int((getattr(usage, "prompt_token_count", 0) or 0) + (getattr(usage, "candidates_token_count", 0) or 0))
        return AIResponse(
            content=(response.text or "").strip(),
            provider=self.id,
            model=model_name,
            tokens_used=tokens_used,
            cost_pence=self.cost_raw,
            frameworks_referenced=[],
        )
