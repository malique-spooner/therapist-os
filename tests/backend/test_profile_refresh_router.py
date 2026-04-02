def test_profile_refresh_endpoint_returns_updated_profile(client):
    response = client.post("/api/profile/refresh", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert "profileDocument" in payload
    assert payload["keyThemes"]
