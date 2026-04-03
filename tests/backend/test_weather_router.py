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


def test_weather_sync_uses_saved_api_key(client, monkeypatch):
    save = client.post(
        "/api/data-sources/weather/setup",
        headers={"X-API-Key": "dev-secret-key"},
        json={"values": {"api_key": "weather-key"}},
    )
    assert save.status_code == 200

    async def fake_sync_today(self, db):
        class Record:
            date = type("DateValue", (), {"isoformat": staticmethod(lambda: "2026-04-02")})()

        return Record()

    monkeypatch.setattr("backend.routers.weather.WeatherIngestionService.sync_today", fake_sync_today)

    response = client.post("/api/weather/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json()["detail"] == "Weather synced"
