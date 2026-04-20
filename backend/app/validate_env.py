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

    if not settings.API_SECRET_KEY or settings.API_SECRET_KEY in {"dev-secret-key", "change-me"}:
        warnings.append("API_SECRET_KEY is using a placeholder value.")
    if settings.DATABASE_URL.startswith("sqlite") or "change-me" in settings.DATABASE_URL:
        warnings.append("DATABASE_URL is using SQLite; production should use PostgreSQL.")
    if settings.FRONTEND_URL.startswith("http://localhost"):
        warnings.append("FRONTEND_URL is using a local development address.")
    if not settings.FRONTEND_URL:
        errors.append("FRONTEND_URL must be set.")
    if settings.ENVIRONMENT == "production" and (not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD):
        warnings.append("ADMIN_EMAIL and ADMIN_PASSWORD should be set in production so login can be enabled.")
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
