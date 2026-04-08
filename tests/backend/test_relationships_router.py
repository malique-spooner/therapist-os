def test_get_relationships_returns_people(client):
    response = client.get("/api/relationships", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert "name" in payload[0]


def test_create_relationship_and_interaction(client):
    create_person = client.post(
        "/api/relationships",
        headers={"X-API-Key": "dev-secret-key"},
        json={"name": "Chris", "type": "friend", "tier": "middle", "desiredFrequencyDays": 14},
    )
    assert create_person.status_code == 200
    person_id = create_person.json()["id"]

    create_interaction = client.post(
        "/api/relationships/interactions",
        headers={"X-API-Key": "dev-secret-key"},
        json={"personIds": [person_id], "type": "message", "presenceScore": 3, "feelingWord": "easy"},
    )
    assert create_interaction.status_code == 200
    assert create_interaction.json()["personIds"] == [person_id]


def test_due_relationships_returns_payload(client):
    response = client.get("/api/relationships/due", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_snapchat_relationship_import_can_be_created(client):
    response = client.post(
        "/api/relationships/imports/snapchat",
        headers={"X-API-Key": "dev-secret-key"},
        files={"screenshot": ("best-friends.png", b"fake-image-bytes", "image/png")},
        data={
            "capturedAt": "2026-04-02T08:30:00",
            "matchedPersonIds": "alex,mum",
            "detectedLabels": "Alex,Mum",
            "note": "Morning check of best friends",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "snapchat_best_friends"
    assert payload["matchedPersonIds"] == ["alex", "mum"]
    assert payload["detectedLabels"] == ["Alex", "Mum"]

    listing = client.get("/api/relationships/imports?mode=real-only", headers={"X-API-Key": "dev-secret-key"})
    assert listing.status_code == 200
    assert listing.json()
