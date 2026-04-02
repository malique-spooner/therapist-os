from backend.routers import location as location_router


def test_location_summary_requires_api_key(client):
    response = client.get("/api/location/summary")
    assert response.status_code == 422


def test_owntracks_webhook_stores_location_and_summary(client):
    response = client.post(
        "/api/location/owntracks",
        json={
            "_type": "location",
            "lat": 51.5074,
            "lon": -0.1278,
            "acc": 12,
            "batt": 88,
            "tst": 1775000000,
        },
    )

    assert response.status_code == 200
    assert response.json()["detail"] == "Location received"

    today = client.get("/api/location/today", headers={"X-API-Key": "dev-secret-key"})
    assert today.status_code == 200
    payload = today.json()
    assert "homeHours" in payload
    assert "commuteDetected" in payload


def test_owntracks_webhook_rejects_invalid_secret(client, monkeypatch):
    monkeypatch.setattr(location_router.settings, "OWNTRACKS_SECRET", "secret123")

    response = client.post(
        "/api/location/owntracks",
        json={"_type": "location", "lat": 51.5, "lon": -0.1, "tst": 1775000000},
        headers={"X-OwnTracks-Secret": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid OwnTracks secret"


def test_location_companion_tags_can_be_saved_and_loaded(client):
    update = client.put(
        "/api/location/companions?date=2026-03-31",
        headers={"X-API-Key": "dev-secret-key"},
        json={
            "personIds": ["alex-id", "mum-id"],
            "contextLabel": "Social outing",
            "note": "Dinner after work",
        },
    )

    assert update.status_code == 200
    assert update.json()["personIds"] == ["alex-id", "mum-id"]

    response = client.get(
        "/api/location/companions?date=2026-03-31",
        headers={"X-API-Key": "dev-secret-key"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["contextLabel"] == "Social outing"
    assert payload["note"] == "Dinner after work"
