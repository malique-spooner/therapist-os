from __future__ import annotations

from openai import AsyncOpenAI

from ...config import settings
from .providers import AIProvider, AIResponse


class OpenAIProvider(AIProvider):
    def __init__(self, provider_id: str, name: str, model: str, cost_per_session: str, cost_raw: int):
        self.id = provider_id
        self.name = name
        self.model = model
        self.cost_per_session = cost_per_session
        self.cost_raw = cost_raw
        self.tier = "paid"
        self.capabilities = ["multimodal", "balanced"]
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    @property
    def is_available(self) -> bool:
        return bool(settings.OPENAI_API_KEY)

    async def send_message(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str) -> AIResponse:
        response = await self._client.chat.completions.create(
            model=self.model,
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_prompt},
                *[
                    {"role": item["role"] if item["role"] in {"user", "assistant"} else "user", "content": item["content"]}
                    for item in conversation_history
                ],
                {"role": "user", "content": message},
            ],
        )
        choice = response.choices[0].message
        usage = response.usage
        tokens_used = int((usage.prompt_tokens or 0) + (usage.completion_tokens or 0)) if usage else 0
        return AIResponse(
            content=(choice.content or "").strip(),
            provider=self.id,
            model=self.model,
            tokens_used=tokens_used,
            cost_pence=self.cost_raw,
            frameworks_referenced=[],
        )
