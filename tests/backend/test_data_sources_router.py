from datetime import datetime, timedelta

from backend.routers import data_sources as data_sources_router
from backend.models import DataSourceConnection, DataSourceSyncAttempt, HealthDataReal


def test_data_sources_list_returns_known_sources(client):
    response = client.get("/api/data-sources", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    ids = {item["id"] for item in payload}
    assert {"garmin", "spotify", "google_drive", "google_maps"} <= ids
    google_drive = next(item for item in payload if item["id"] == "google_drive")
    assert google_drive["folderPath"] == "Therapist OS / Google Takeout"


def test_data_source_activity_returns_dataset_stats_and_attempts(client, db_session):
    db_session.add(
        HealthDataReal(
            date=datetime.utcnow().date(),
            steps=1234,
            sleep_duration_hours=7.5,
            sleep_quality=82,
            hrv_ms=54,
            resting_hr=61,
            workout_logged=False,
        )
    )
    db_session.add(
        DataSourceSyncAttempt(
            source_id="garmin",
            status="failed",
            trigger="manual",
            data_mode="real-only",
            rows_synced=0,
            detail="Garmin is rate-limiting login attempts right now.",
        )
    )
    db_session.commit()

    response = client.get("/api/data-sources/activity?mode=demo-only", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "real-only"
    garmin = next(item for item in payload["items"] if item["id"] == "garmin")
    assert garmin["recordsAvailable"] >= 1
    assert garmin["recentAttempts"]
    assert garmin["recentAttempts"][0]["status"] == "failed"
    assert garmin["recentAttempts"][0]["dataMode"] == "real-only"


def test_data_source_connect_returns_hint_when_not_configured(client):
    response = client.post("/api/data-sources/garmin/connect", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"]["connected"] is True
    assert payload["detail"] == "Data source connected"


def test_data_source_setup_returns_fields(client):
    response = client.get("/api/data-sources/garmin/setup", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "garmin"
    assert payload["mode"] == "folder"
    assert {field["key"] for field in payload["fields"]} == {"folder_path"}
    assert payload["instructions"]


def test_google_drive_setup_requires_oauth_fields_and_instructions(client):
    response = client.get("/api/data-sources/google_drive/setup", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert {field["key"] for field in payload["fields"]} == {"folder_path", "client_id", "client_secret", "refresh_token"}
    assert any("callback URL" in instruction for instruction in payload["instructions"])


def test_owntracks_setup_returns_public_webhook_url(client):
    response = client.get("/api/data-sources/owntracks/setup", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["webhookUrl"] == "http://localhost:3000/api/location/owntracks"
    assert ":8000" not in payload["webhookUrl"]
    assert any("Basic authentication" in instruction for instruction in payload["instructions"])


def test_google_maps_setup_requires_browser_api_key(client):
    response = client.get("/api/data-sources/google_maps/setup", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "google_maps"
    assert payload["actionLabel"] == "Save API key"
    assert {field["key"] for field in payload["fields"]} == {"api_key"}
    assert any("browser API key" in instruction for instruction in payload["instructions"])


def test_data_source_setup_save_marks_source_connected(client):
    response = client.post(
        "/api/data-sources/garmin/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"folder_path": "TherapistOS/Garmin"}},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"]["connected"] is True
    assert payload["source"]["lastError"] is None


def test_oauth_source_setup_save_marks_source_ready_but_not_connected(client):
    response = client.post(
        "/api/data-sources/spotify/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"client_id": "client123", "client_secret": "secret123"}},
    )

    assert response.status_code == 200
    payload = response.json()["source"]
    assert payload["available"] is False
    assert payload["connected"] is False
    assert payload["connectionState"] == "authorization-required"


def test_sensitive_setup_values_are_encrypted_at_rest(client, db_session):
    response = client.post(
        "/api/data-sources/spotify/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"client_id": "client123", "client_secret": "topsecret", "refresh_token": "refresh456"}},
    )

    assert response.status_code == 200
    record = db_session.get(DataSourceConnection, "spotify")
    assert record is not None
    assert record.config_json == {"client_id": "client123"}
    assert record.encrypted_config_json is not None
    assert "topsecret" not in record.encrypted_config_json


def test_data_source_setup_masks_saved_password_fields(client):
    client.post(
        "/api/data-sources/spotify/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"client_id": "client123", "client_secret": "topsecret"}},
    )

    response = client.get("/api/data-sources/spotify/setup", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    secret_field = next(field for field in response.json()["fields"] if field["key"] == "client_secret")
    assert secret_field["hasValue"] is True
    assert secret_field["value"] is None


def test_data_source_setup_returns_recent_sync_attempts(client, db_session):
    db_session.add(
        DataSourceSyncAttempt(
            source_id="garmin",
            status="failed",
            trigger="manual",
            detail="Garmin is rate-limiting login attempts right now.",
        )
    )
    db_session.commit()

    response = client.get("/api/data-sources/garmin/setup", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    attempts = response.json()["recentAttempts"]
    assert attempts
    assert attempts[0]["status"] == "failed"


def test_data_source_authorize_returns_url(client, monkeypatch):
    monkeypatch.setattr(data_sources_router.service, "begin_authorization", lambda source_id, db: "https://accounts.spotify.com/authorize?state=test")

    response = client.post("/api/data-sources/spotify/authorize", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json()["url"].startswith("https://accounts.spotify.com/authorize")


def test_data_source_oauth_callback_returns_connected_source(client, monkeypatch):
    async def fake_complete(source_id, code, state, error, db):
        return {
            "id": source_id,
            "name": "Spotify",
            "category": "Consumption - Music, Listening Patterns",
            "icon": "🎵",
            "connected": True,
            "available": True,
            "lastSync": None,
            "lastSyncStatus": None,
            "folderPath": None,
            "connectionHint": None,
            "lastError": None,
        }

    monkeypatch.setattr(data_sources_router.service, "complete_authorization", fake_complete)

    response = client.post(
        "/api/data-sources/spotify/oauth/callback",
        headers={"X-API-Key": "dev-secret-key"},
        json={"code": "abc", "state": "xyz"},
    )

    assert response.status_code == 200
    assert response.json()["source"]["connected"] is True


def test_data_source_sync_uses_service_result(client, monkeypatch):
    async def fake_sync(source_id, db, trigger="manual"):
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
            "manualSyncAllowed": False,
        }

    monkeypatch.setattr(data_sources_router.service, "sync", fake_sync)

    response = client.post("/api/data-sources/garmin/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json()["detail"] == "Data source synced"


def test_data_source_sync_returns_automatic_only_for_garmin_manual_sync(client):
    response = client.post("/api/data-sources/garmin/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()["source"]
    assert payload["lastSyncStatus"] == "automatic-only"
    assert "not available" in payload["lastError"]


def test_data_source_sync_ignores_legacy_garmin_cooldown(client, db_session):
    service = data_sources_router.service
    record = service._record("garmin", db_session)
    record.available = True
    record.connected = False
    record.last_sync_status = "failed"
    record.last_error = "Garmin is rate-limiting login attempts right now (429 Too Many Requests)."
    record.config_json = {"garmin_retry_after": (datetime.utcnow() + timedelta(minutes=30)).isoformat()}
    db_session.commit()

    response = client.post("/api/data-sources/garmin/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()["source"]
    assert payload["lastSyncStatus"] == "automatic-only"
    assert "not available" in payload["lastError"]


def test_data_source_serializes_relative_sync_time(db_session):
    service = data_sources_router.service
    record = service._record("garmin", db_session)
    record.connected = True
    record.last_sync_at = datetime.utcnow() - timedelta(minutes=5)
    db_session.commit()

    payload = service.list_sources(db_session)
    garmin = next(item for item in payload if item["id"] == "garmin")
    assert garmin["lastSync"] == "5 min ago"
