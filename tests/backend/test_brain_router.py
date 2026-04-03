def test_brain_payload_returns_dynamic_overview(client):
    response = client.get("/api/brain", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["overview"]["version"] == "Brain v3"
    assert payload["overview"]["totalLayers"] == 10
    assert len(payload["layers"]) == 10
    assert payload["versions"][0]["id"] == "v3"
