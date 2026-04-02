from datetime import datetime, timedelta

from backend.routers import data_sources as data_sources_router


def test_data_sources_list_returns_known_sources(client):
    response = client.get("/api/data-sources", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    ids = {item["id"] for item in payload}
    assert {"garmin", "truelayer", "spotify", "google_drive", "voice_journal"} <= ids
    google_drive = next(item for item in payload if item["id"] == "google_drive")
    assert google_drive["folderPath"] == "Therapist OS / Google Takeout"


def test_data_source_connect_returns_hint_when_not_configured(client):
    response = client.post("/api/data-sources/garmin/connect", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"]["connected"] is False
    assert "GARMIN_EMAIL" in payload["detail"]


def test_data_source_sync_uses_service_result(client, monkeypatch):
    async def fake_sync(source_id, db):
        return {
            "id": source_id,
            "name": "Garmin Connect",
            "category": "Body - Steps, Sleep, HRV, Workouts",
            "icon": "⌚",
            "connected": True,
            "available": True,
            "lastSync": "just now",
            "lastSyncStatus": "success",
            "connectionHint": None,
            "lastError": None,
        }

    monkeypatch.setattr(data_sources_router.service, "sync", fake_sync)

    response = client.post("/api/data-sources/garmin/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json()["detail"] == "Data source synced"


def test_data_source_serializes_relative_sync_time(db_session):
    service = data_sources_router.service
    record = service._record("garmin", db_session)
    record.connected = True
    record.last_sync_at = datetime.utcnow() - timedelta(minutes=5)
    db_session.commit()

    payload = service.list_sources(db_session)
    garmin = next(item for item in payload if item["id"] == "garmin")
    assert garmin["lastSync"] == "5 min ago"
