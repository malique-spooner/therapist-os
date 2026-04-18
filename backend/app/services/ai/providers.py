from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, AsyncIterator


@dataclass
class AIResponse:
    content: str
    provider: str
    model: str
    tokens_used: int
    cost_pence: int
    frameworks_referenced: list[str]


class AIProvider(ABC):
    id: str
    name: str
    model: str
    cost_per_session: str
    cost_raw: int
    tier: str
    capabilities: list[str]

    @property
    @abstractmethod
    def is_available(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def send_message(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        system_prompt: str,
        model_override: str | None = None,
    ) -> AIResponse:
        raise NotImplementedError

    async def stream_message(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        system_prompt: str,
        model_override: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        response = await self.send_message(message, conversation_history, system_prompt, model_override=model_override)
        yield {
            "delta": response.content,
            "done": True,
            "provider": response.provider,
            "model": response.model,
            "tokens_used": response.tokens_used,
            "cost_pence": response.cost_pence,
            "frameworks_referenced": response.frameworks_referenced,
        }


from .anthropic import AnthropicProvider  # noqa: E402
from .google import GoogleProvider  # noqa: E402
from .groq import GroqProvider  # noqa: E402
from .ollama import OllamaProvider  # noqa: E402
from .openai import OpenAIProvider  # noqa: E402


REAL_PROVIDERS: dict[str, AIProvider] = {
    "local-qwen": OllamaProvider(
        "local-qwen",
        "Local Mind",
        "local-chat",
        "Private on Mac",
        0,
    ),
    "gemini-flash": GoogleProvider("gemini-flash", "Gemini Flash", "gemini-2.0-flash", "Free", 0),
    "gemini-pro": GoogleProvider("gemini-pro", "Gemini Pro", "gemini-1.5-pro", "Free tier", 0),
    "claude-haiku": AnthropicProvider("claude-haiku", "Claude Haiku", "claude-haiku-4-5-20251001", "~£0.02 per session", 2),
    "claude-sonnet": AnthropicProvider("claude-sonnet", "Claude Sonnet", "claude-sonnet-4-20250514", "~£0.08 per session", 8),
    "groq-llama": GroqProvider("groq-llama", "Groq Llama", "llama-3.3-70b-versatile", "Free", 0),
    "openai-4o": OpenAIProvider("openai-4o", "OpenAI GPT-4o", "gpt-4o", "~£0.06 per session", 6),
}

def provider_payloads() -> list[dict[str, Any]]:
    providers = []
    for provider_id, provider in REAL_PROVIDERS.items():
        providers.append(
            {
                "id": provider.id,
                "name": provider.name,
                "model": provider.model,
                "costPerSession": provider.cost_per_session,
                "costRaw": provider.cost_raw,
                "tier": provider.tier,
                "capabilities": provider.capabilities,
                "isAvailable": provider.is_available,
            }
        )
    return providers


def select_provider(provider_id: str) -> AIProvider:
    provider = REAL_PROVIDERS.get(provider_id)
    if not provider:
        raise KeyError(provider_id)
    if not provider.is_available:
        raise RuntimeError(f"{provider.name} is not available in this environment.")
    return provider


def has_real_provider(provider_id: str) -> bool:
    provider = REAL_PROVIDERS.get(provider_id)
    return bool(provider and provider.is_available)
