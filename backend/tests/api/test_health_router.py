from datetime import datetime, timedelta

from app.models import DataSourceConnection


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


def test_health_sync_is_automatic_only(client):
    response = client.post("/api/health/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 405
    assert "automatic only" in response.json()["detail"]


def test_health_sync_throttles_after_rate_limit(client, db_session):
    record = db_session.get(DataSourceConnection, "garmin")
    if not record:
        record = DataSourceConnection(source_id="garmin", display_name="Garmin Drive Import", category="Body")
        db_session.add(record)
    record.available = True
    record.connected = False
    record.last_sync_status = "failed"
    record.last_error = "Garmin is rate-limiting login attempts right now (429 Too Many Requests)."
    record.config_json = {"garmin_retry_after": (datetime.utcnow() + timedelta(minutes=30)).isoformat()}
    db_session.commit()

    response = client.post("/api/health/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 405
    assert "automatic only" in response.json()["detail"]
