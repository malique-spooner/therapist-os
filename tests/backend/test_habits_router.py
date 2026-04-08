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

    refreshed = client.get("/api/habits?mode=real-only", headers={"X-API-Key": "dev-secret-key"})
    assert refreshed.status_code == 200
    refreshed_payload = refreshed.json()
    assert refreshed_payload["todayCompletions"][habit_id] is True


def test_habit_delete_hides_habit_but_preserves_logs(client):
    initial = client.get("/api/habits?mode=demo-only", headers={"X-API-Key": "dev-secret-key"})
    assert initial.status_code == 200
    payload = initial.json()
    habit_id = payload["habits"][0]["id"]

    save_response = client.post(
        "/api/habits/logs?mode=demo-only",
        headers={"X-API-Key": "dev-secret-key"},
        json={"habitId": habit_id, "value": True},
    )
    assert save_response.status_code == 200

    delete_response = client.delete(f"/api/habits/{habit_id}", headers={"X-API-Key": "dev-secret-key"})
    assert delete_response.status_code == 200

    refreshed = client.get("/api/habits?mode=demo-only", headers={"X-API-Key": "dev-secret-key"})
    assert refreshed.status_code == 200
    refreshed_payload = refreshed.json()
    assert all(habit["id"] != habit_id for habit in refreshed_payload["habits"])
    assert habit_id in refreshed_payload["todayCompletions"]


def test_create_custom_bad_habit_with_quantity_unit(client):
    create_response = client.post(
        "/api/habits",
        headers={"X-API-Key": "dev-secret-key"},
        json={
            "actionText": "stay off nicotine gum",
            "whenText": "whenever the urge hits",
            "whyText": "I want my energy to feel earned",
            "habitMode": "bad",
            "cadenceType": "custom",
            "targetCount": 0,
            "type": "numeric",
            "unit": "pieces",
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["type"] == "numeric"
    assert created["unit"] == "pieces"
    assert created["habitMode"] == "bad"
