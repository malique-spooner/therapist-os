# Privacy

Therapist OS handles highly sensitive data:
- health
- mood
- relationships
- spending
- location
- therapist conversations

## Current Direction

The product is moving toward:
- VPS for storage and APIs
- Mac for private local inference
- minimal or no third-party AI exposure for personal context

## Logging Rules

- Never log API keys, tokens, passwords, transcripts, profile documents, or raw coordinates.
- Request headers like `Authorization` and `X-API-Key` are redacted.
- Structured logs are emitted to stdout for container collection.

## AI Boundaries

The intended privacy-first model is:
- data stored on the VPS
- Brain and therapist inference run on the Mac
- phone reads stored results from the VPS

Until that is fully wired, any cloud-provider-era code should be treated as transitional.

## Connection Privacy

When local inference is connected, the intended networking model is:
- phone -> VPS
- VPS -> Mac over a private network path

The Mac should not be exposed as a public AI endpoint.

## Operational Guidance

- Use private ntfy topics.
- Keep production behind HTTPS.
- Restrict server access with firewall rules and a non-root deploy user.
- Keep Postgres off the public internet.
- Encrypt backups if used in real deployment.
