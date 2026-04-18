def test_get_checkins_returns_history(client):
    response = client.get("/api/checkins?period=this-week", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert "emotionalState" in payload[0]


def test_save_checkin_and_get_streak(client):
    save = client.post(
        "/api/checkins",
        headers={"X-API-Key": "dev-secret-key"},
        json={"emotionalState": 4, "energyLevel": 3, "oneWord": "steady"},
    )
    assert save.status_code == 200
    assert save.json()["oneWord"] == "steady"

    streak = client.get("/api/checkins/streak", headers={"X-API-Key": "dev-secret-key"})
    assert streak.status_code == 200
    assert "streak" in streak.json()
    assert save.json()["timestamp"] > 2_147_483_647
