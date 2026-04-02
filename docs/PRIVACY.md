# Privacy

Therapist OS handles highly sensitive data.

## Logging rules

- Never log API keys, tokens, passwords, transcripts, profile documents, or raw coordinates.
- Request headers like `Authorization` and `X-API-Key` are redacted.
- Structured logs are emitted to stdout for container collection.

## AI provider boundaries

- Only the data required for the active therapist exchange should be sent to external AI providers.
- Transcripts and profile content should not appear in logs.

## Operational guidance

- Use private ntfy topics.
- Keep production behind HTTPS.
- Restrict server access with firewall rules and a non-root deploy user.
