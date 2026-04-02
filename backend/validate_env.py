from __future__ import annotations

from dataclasses import dataclass

from .config import settings


@dataclass
class ValidationResult:
    ok: bool
    errors: list[str]
    warnings: list[str]


def validate_settings() -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []

    if not settings.API_SECRET_KEY or settings.API_SECRET_KEY == "dev-secret-key":
        warnings.append("API_SECRET_KEY is using a development value.")
    if settings.DATABASE_URL.startswith("sqlite"):
        warnings.append("DATABASE_URL is using SQLite; production should use PostgreSQL.")
    if not settings.FRONTEND_URL:
        errors.append("FRONTEND_URL must be set.")
    warnings.append("Public API keys should match the backend key only for single-user local deployments.")
    return ValidationResult(ok=not errors, errors=errors, warnings=warnings)


def main() -> None:
    result = validate_settings()
    for warning in result.warnings:
        print(f"WARNING: {warning}")
    for error in result.errors:
        print(f"ERROR: {error}")
    if not result.ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
