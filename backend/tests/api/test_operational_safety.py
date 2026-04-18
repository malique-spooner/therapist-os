from app.core.logging import REDACTED, sanitize_dict
from app.validate_env import validate_settings


def test_sanitize_dict_redacts_sensitive_fields():
    payload = sanitize_dict(
        {
            "authorization": "secret-token",
            "content": "therapy transcript",
            "nested": {"latitude": 51.5, "safe": "value"},
        }
    )

    assert payload["authorization"] == REDACTED
    assert payload["content"] == REDACTED
    assert payload["nested"]["latitude"] == REDACTED
    assert payload["nested"]["safe"] == "value"


def test_validate_settings_produces_warnings():
    result = validate_settings()

    assert result.ok is True
    assert result.warnings
