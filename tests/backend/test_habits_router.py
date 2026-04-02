def test_habits_get_and_update_flow(client):
    response = client.get("/api/habits", headers={"X-API-Key": "dev-secret-key"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["habits"]
    habit_id = payload["habits"][0]["id"]

    save_response = client.post(
        "/api/habits/logs",
        headers={"X-API-Key": "dev-secret-key"},
        json={"habitId": habit_id, "value": True},
    )
    assert save_response.status_code == 200

    refreshed = client.get("/api/habits", headers={"X-API-Key": "dev-secret-key"})
    assert refreshed.status_code == 200
    refreshed_payload = refreshed.json()
    assert refreshed_payload["todayCompletions"][habit_id] is True
