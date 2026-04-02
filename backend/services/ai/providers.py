from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


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
    async def send_message(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str) -> AIResponse:
        raise NotImplementedError


class DeterministicFallbackProvider(AIProvider):
    def __init__(self, provider_id: str, name: str, model: str, cost_per_session: str, cost_raw: int, tier: str, capabilities: list[str]):
        self.id = provider_id
        self.name = name
        self.model = model
        self.cost_per_session = cost_per_session
        self.cost_raw = cost_raw
        self.tier = tier
        self.capabilities = capabilities

    @property
    def is_available(self) -> bool:
        return True

    async def send_message(self, message: str, conversation_history: list[dict[str, str]], system_prompt: str) -> AIResponse:
        lower = message.lower()
        framework = "CBT"
        if any(word in lower for word in ("motivat", "stuck", "energy", "social")):
            framework = "SDT"
        if any(word in lower for word in ("spend", "habit", "repeat", "pattern")):
            framework = "Behaviourism"

        recent_context = system_prompt.split("##")[-1].strip()[:180]
        content = (
            f"{'That fits a pattern in your recent data.' if framework == 'CBT' else 'There is a real pattern worth paying attention to.'} "
            f"{'CBT would ask what thought is shaping this moment.' if framework == 'CBT' else 'SDT would ask which need feels least met right now.' if framework == 'SDT' else 'Behaviourism would ask what is reinforcing this pattern for you.'} "
            "What feels most true for you right now?"
        )
        if recent_context:
            content = f"{content}\n\nContext I’m tracking: {recent_context}"
        return AIResponse(
            content=content,
            provider=self.id,
            model=self.model,
            tokens_used=max(120, len(message) + sum(len(item.get("content", "")) for item in conversation_history)),
            cost_pence=self.cost_raw,
            frameworks_referenced=[framework],
        )


from .anthropic import AnthropicProvider  # noqa: E402
from .google import GoogleProvider  # noqa: E402
from .groq import GroqProvider  # noqa: E402
from .openai import OpenAIProvider  # noqa: E402


REAL_PROVIDERS: dict[str, AIProvider] = {
    "local-qwen": DeterministicFallbackProvider(
        "local-qwen",
        "Local Mind",
        "qwen3:30b",
        "Private on Mac",
        0,
        "free",
        ["private therapist chat", "daily insights", "pattern synthesis"],
    ),
    "gemini-flash": GoogleProvider("gemini-flash", "Gemini Flash", "gemini-2.0-flash", "Free", 0),
    "gemini-pro": GoogleProvider("gemini-pro", "Gemini Pro", "gemini-1.5-pro", "Free tier", 0),
    "claude-haiku": AnthropicProvider("claude-haiku", "Claude Haiku", "claude-haiku-4-5-20251001", "~£0.02 per session", 2),
    "claude-sonnet": AnthropicProvider("claude-sonnet", "Claude Sonnet", "claude-sonnet-4-20250514", "~£0.08 per session", 8),
    "groq-llama": GroqProvider("groq-llama", "Groq Llama", "llama-3.3-70b-versatile", "Free", 0),
    "openai-4o": OpenAIProvider("openai-4o", "OpenAI GPT-4o", "gpt-4o", "~£0.06 per session", 6),
}


FALLBACK_PROVIDERS: dict[str, AIProvider] = {
    provider_id: DeterministicFallbackProvider(
        provider_id=provider.id,
        name=provider.name,
        model=provider.model,
        cost_per_session=provider.cost_per_session,
        cost_raw=provider.cost_raw,
        tier=provider.tier,
        capabilities=provider.capabilities,
    )
    for provider_id, provider in REAL_PROVIDERS.items()
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
    if provider and provider.is_available:
        return provider
    if provider_id in FALLBACK_PROVIDERS:
        return FALLBACK_PROVIDERS[provider_id]
    return FALLBACK_PROVIDERS["local-qwen"]
