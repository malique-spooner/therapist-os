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
