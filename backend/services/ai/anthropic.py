from __future__ import annotations

from anthropic import AsyncAnthropic

from ...config import settings
from .providers import AIProvider, AIResponse


class AnthropicProvider(AIProvider):
    def __init__(self, provider_id: str, name: str, model: str, cost_per_session: str, cost_raw: int):
        self.id = provider_id
        self.name = name
        self.model = model
        self.cost_per_session = cost_per_session
        self.cost_raw = cost_raw
        self.tier = "paid"
        self.capabilities = ["best reasoning", "recommended"] if "sonnet" in provider_id else ["fast", "great reasoning"]
        self._client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    @property
    def is_available(self) -> bool:
        return bool(settings.ANTHROPIC_API_KEY)

    async def send_message(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str) -> AIResponse:
        response = await self._client.messages.create(
            model=self.model,
            system=system_prompt,
            max_tokens=500,
            messages=[
                {"role": item["role"] if item["role"] in {"user", "assistant"} else "user", "content": item["content"]}
                for item in conversation_history
            ] + [{"role": "user", "content": message}],
        )
        text_blocks = [block.text for block in response.content if getattr(block, "type", "") == "text"]
        content = "\n".join(text_blocks).strip()
        usage = getattr(response, "usage", None)
        tokens_used = int((getattr(usage, "input_tokens", 0) or 0) + (getattr(usage, "output_tokens", 0) or 0))
        return AIResponse(
            content=content,
            provider=self.id,
            model=self.model,
            tokens_used=tokens_used,
            cost_pence=self.cost_raw,
            frameworks_referenced=[],
        )
