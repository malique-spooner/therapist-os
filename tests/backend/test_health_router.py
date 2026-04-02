from datetime import date
from types import SimpleNamespace

from backend.routers import health as health_router


def test_health_today_returns_latest_record(client):
    response = client.get("/api/health/today", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["steps"] >= 0
    assert "sleepDuration" in payload
    assert "hadWorkout" in payload


def test_health_period_accepts_week_alias(client):
    response = client.get("/api/health?period=week", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert len(payload) <= 7


def test_health_sync_uses_service_result(client, monkeypatch):
    async def fake_sync(_db):
        return [SimpleNamespace(date=date(2026, 4, 1))]

    monkeypatch.setattr(health_router.service, "sync_last_7_days", fake_sync)

    response = client.post("/api/health/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json() == {
        "detail": "Health synced",
        "daysSynced": 1,
        "latestDate": "2026-04-01",
    }


def test_health_sync_surfaces_configuration_errors(client, monkeypatch):
    async def fake_sync(_db):
        raise RuntimeError("Garmin credentials are not configured")

    monkeypatch.setattr(health_router.service, "sync_last_7_days", fake_sync)

    response = client.post("/api/health/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 400
    assert "Garmin credentials" in response.json()["detail"]
