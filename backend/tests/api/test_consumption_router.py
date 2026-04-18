from datetime import date
from types import SimpleNamespace

from app.routers import consumption as consumption_router


def test_consumption_today_returns_latest_summary(client):
    response = client.get("/api/consumption/today", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["listeningHours"] >= 0
    assert isinstance(payload["topGenres"], list)
    assert isinstance(payload["topTracks"], list)
    assert "providerBreakdown" in payload
    assert "spotify" in payload["providerBreakdown"]


def test_consumption_period_accepts_3months_alias(client):
    response = client.get("/api/consumption?period=3months", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload


def test_consumption_sync_uses_service_result(client, monkeypatch):
    async def fake_sync(_db):
        return [SimpleNamespace(date=date(2026, 4, 1))]

    monkeypatch.setattr(
        consumption_router,
        "_spotify_service",
        lambda _db: SimpleNamespace(sync_recent_listening=fake_sync),
    )

    response = client.post("/api/consumption/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json() == {
        "detail": "Consumption synced",
        "daysSynced": 1,
        "latestDate": "2026-04-01",
        "playsSynced": None,
    }


def test_consumption_sync_surfaces_configuration_errors(client, monkeypatch):
    async def fake_sync(_db):
        raise RuntimeError("Spotify credentials are not configured")

    monkeypatch.setattr(
        consumption_router,
        "_spotify_service",
        lambda _db: SimpleNamespace(sync_recent_listening=fake_sync),
    )

    response = client.post("/api/consumption/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 400
    assert "Spotify credentials" in response.json()["detail"]
