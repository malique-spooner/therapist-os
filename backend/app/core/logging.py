from __future__ import annotations

import contextvars
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")
job_name_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("job_name", default="-")

REDACTED = "***REDACTED***"
SENSITIVE_KEYS = {
    "authorization",
    "x-api-key",
    "api_secret_key",
    "anthropic_api_key",
    "openai_api_key",
    "google_ai_api_key",
    "groq_api_key",
    "password",
    "token",
    "secret",
    "refresh_token",
    "access_token",
    "profile_document",
    "content",
    "latitude",
    "longitude",
}


def redact_value(key: str, value: Any) -> Any:
    if any(fragment in key.lower() for fragment in SENSITIVE_KEYS):
        return REDACTED
    if isinstance(value, dict):
        return {child_key: redact_value(child_key, child_value) for child_key, child_value in value.items()}
    if isinstance(value, list):
        return [redact_value(key, item) for item in value]
    return value


def sanitize_dict(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not payload:
        return {}
    return {key: redact_value(key, value) for key, value in payload.items()}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx.get(),
            "job_name": job_name_ctx.get(),
        }
        if hasattr(record, "event"):
            payload["event"] = getattr(record, "event")
        if hasattr(record, "extra_data"):
            payload["data"] = sanitize_dict(getattr(record, "extra_data"))
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(log_level: str = "INFO") -> None:
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level.upper())

    for noisy_logger in ("uvicorn.access",):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
