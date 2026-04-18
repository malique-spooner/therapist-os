def test_healthcheck_endpoint(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "environment" in payload


def test_readiness_endpoint(client):
    response = client.get("/readyz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["database"] == "ok"
    assert "warnings" in payload
