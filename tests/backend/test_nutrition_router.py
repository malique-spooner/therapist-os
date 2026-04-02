def test_get_nutrition_returns_days(client):
    response = client.get("/api/nutrition?period=this-week", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert "meals" in payload[0]
    assert "foodQuality" in payload[0]


def test_save_nutrition_today_upserts_row(client):
    payload = {
        "meals": {"breakfast": True, "lunch": True, "dinner": True, "heavySnacking": False},
        "foodQuality": 3,
        "caffeine": {"count": 1, "lastBeforeNoon": True},
        "alcohol": {"units": 0},
    }

    response = client.post("/api/nutrition/today", headers={"X-API-Key": "dev-secret-key"}, json=payload)

    assert response.status_code == 200
    assert response.json()["foodQuality"] == 3
    assert response.json()["meals"]["breakfast"] is True
