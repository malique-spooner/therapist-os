def test_weather_returns_seeded_data(client):
    response = client.get("/api/weather?period=this-week", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert "daylightHours" in payload[0]
    assert "condition" in payload[0]


def test_weather_sync_requires_configuration(client):
    response = client.post("/api/weather/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 400
    assert "OPENWEATHER_API_KEY" in response.json()["detail"]
