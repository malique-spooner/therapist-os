from backend.routers import location as location_router


def test_location_summary_requires_api_key(client):
    response = client.get("/api/location/summary")
    assert response.status_code == 401


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


def test_owntracks_webhook_accepts_saved_basic_auth(client):
    save = client.post(
        "/api/data-sources/owntracks/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"username": "tracker", "password": "supersecret"}},
    )
    assert save.status_code == 200

    response = client.post(
        "/api/location/owntracks",
        json={"_type": "location", "lat": 51.5, "lon": -0.1, "tst": 1775000000},
        headers={"Authorization": "Basic dHJhY2tlcjpzdXBlcnNlY3JldA=="},
    )

    assert response.status_code == 200
    assert response.json()["detail"] == "Location received"


def test_owntracks_webhook_marks_successful_sync_attempt(client):
    save = client.post(
        "/api/data-sources/owntracks/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"username": "tracker", "password": "supersecret"}},
    )
    assert save.status_code == 200

    response = client.post(
        "/api/location/owntracks",
        json={"_type": "location", "lat": 51.5, "lon": -0.1, "tst": 1775000000},
        headers={"Authorization": "Basic dHJhY2tlcjpzdXBlcnNlY3JldA=="},
    )

    assert response.status_code == 200

    activity = client.get("/api/data-sources/owntracks/setup", headers={"X-API-Key": "dev-secret-key"})
    assert activity.status_code == 200
    attempt = next(item for item in activity.json()["recentAttempts"] if item["status"] == "success")
    assert attempt["status"] == "success"
    assert attempt["rowsSynced"] == 1


def test_owntracks_webhook_records_failed_attempt_for_invalid_credentials(client):
    save = client.post(
        "/api/data-sources/owntracks/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"username": "tracker", "password": "supersecret"}},
    )
    assert save.status_code == 200

    response = client.post(
        "/api/location/owntracks",
        json={"_type": "location", "lat": 51.5, "lon": -0.1, "tst": 1775000000},
        headers={"Authorization": "Basic dHJhY2tlcjp3cm9uZw=="},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid OwnTracks credentials"

    activity = client.get("/api/data-sources/owntracks/setup", headers={"X-API-Key": "dev-secret-key"})
    assert activity.status_code == 200
    attempt = next(item for item in activity.json()["recentAttempts"] if item["status"] == "failed")
    assert attempt["status"] == "failed"
    assert attempt["detail"] == "Invalid OwnTracks credentials"


def test_owntracks_transition_event_is_stored(client):
    save = client.post(
        "/api/data-sources/owntracks/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"username": "tracker", "password": "supersecret"}},
    )
    assert save.status_code == 200

    response = client.post(
        "/api/location/owntracks",
        json={
            "_type": "transition",
            "tst": 1775000300,
            "lat": 51.5001,
            "lon": -0.101,
            "event": "enter",
            "desc": "Football",
            "tid": "iphone",
        },
        headers={"Authorization": "Basic dHJhY2tlcjpzdXBlcnNlY3JldA=="},
    )

    assert response.status_code == 200
    assert response.json()["detail"] == "Location event received"


def test_owntracks_region_event_is_stored(client):
    save = client.post(
        "/api/data-sources/owntracks/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"username": "tracker", "password": "supersecret"}},
    )
    assert save.status_code == 200

    response = client.post(
        "/api/location/owntracks",
        json={
            "_type": "region",
            "tst": 1775000500,
            "lat": 51.501,
            "lon": -0.11,
            "event": "leave",
            "desc": "Clapham Common",
            "region": "common-west",
        },
        headers={"Authorization": "Basic dHJhY2tlcjpzdXBlcnNlY3JldA=="},
    )

    assert response.status_code == 200
    assert response.json()["detail"] == "Location event received"


def test_location_place_memory_can_be_saved_and_loaded(client):
    update = client.put(
        "/api/location/places/football-pitch",
        headers={"X-API-Key": "dev-secret-key"},
        json={
            "label": "Football",
            "category": "social",
            "tone": "positive",
            "note": "Usually regulating",
        },
    )

    assert update.status_code == 200
    assert update.json()["label"] == "Football"

    response = client.get("/api/location/places?mode=real-only", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert any(item["placeKey"] == "football-pitch" and item["tone"] == "positive" for item in payload)


def test_location_place_history_tracks_updates_merge_and_split(client):
    for key, label, latitude, longitude in (
        ("football-pitch", "Football", 51.5001, -0.101),
        ("sports-centre", "Sports Centre", 51.5003, -0.1012),
    ):
        update = client.put(
            f"/api/location/places/{key}",
            headers={"X-API-Key": "dev-secret-key"},
            json={
                "label": label,
                "category": "social",
                "tone": "positive",
                "note": "Usually regulating",
            },
        )
        assert update.status_code == 200

    merge = client.post(
        "/api/location/places/football-pitch/merge",
        headers={"X-API-Key": "dev-secret-key"},
        json={"targetPlaceKey": "sports-centre"},
    )
    assert merge.status_code == 200
    assert merge.json()["status"] == "merged"
    assert merge.json()["mergedIntoKey"] == "sports-centre"

    split = client.post(
        "/api/location/places/sports-centre/split",
        headers={"X-API-Key": "dev-secret-key"},
        json={"newPlaceKey": "sports-centre-2", "label": "Sports Centre Alt"},
    )
    assert split.status_code == 200
    assert split.json()["splitFromKey"] == "sports-centre"

    history = client.get(
        "/api/location/places/sports-centre/history?mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
    )
    assert history.status_code == 200
    payload = history.json()
    assert any(item["action"] == "rename" for item in payload)
    assert any(item["action"] == "split" for item in payload)


def test_location_intelligence_comes_from_backend_inference(client):
    save = client.post(
        "/api/data-sources/owntracks/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"username": "tracker", "password": "supersecret"}},
    )
    assert save.status_code == 200

    for point in (
        {"_type": "location", "lat": 51.50745, "lon": -0.12782, "acc": 10, "batt": 88, "tst": 1775000000},
        {"_type": "location", "lat": 51.50746, "lon": -0.12781, "acc": 9, "batt": 87, "tst": 1775001800},
        {"_type": "location", "lat": 51.5001, "lon": -0.1010, "acc": 12, "batt": 85, "tst": 1775005400},
        {"_type": "location", "lat": 51.5002, "lon": -0.1011, "acc": 11, "batt": 83, "tst": 1775009000},
    ):
        response = client.post(
            "/api/location/owntracks",
            json=point,
            headers={"Authorization": "Basic dHJhY2tlcjpzdXBlcnNlY3JldA=="},
        )
        assert response.status_code == 200

    event = client.post(
        "/api/location/owntracks",
        json={
            "_type": "transition",
            "tst": 1775009100,
            "lat": 51.5002,
            "lon": -0.1011,
            "event": "enter",
            "desc": "Football",
            "tid": "iphone",
        },
        headers={"Authorization": "Basic dHJhY2tlcjpzdXBlcnNlY3JldA=="},
    )
    assert event.status_code == 200

    intelligence = client.get(
        "/api/location/intelligence?startDate=2026-03-31&endDate=2026-04-01&date=2026-04-01&mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
    )

    assert intelligence.status_code == 200
    payload = intelligence.json()
    assert payload["hasRealMapData"] is True
    assert len(payload["visits"]) >= 2
    assert any(place["status"] == "active" for place in payload["places"])
    assert any(scene["id"] == "geofence-signal" for scene in payload["recapScenes"])
    assert any(stat["label"] == "OwnTracks events" for stat in payload["rangeStats"])


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
        "/api/location/companions?date=2026-03-31&mode=real-only",
        headers={"X-API-Key": "dev-secret-key"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["contextLabel"] == "Social outing"
    assert payload["note"] == "Dinner after work"
