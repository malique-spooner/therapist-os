def test_open_prompt_returns_candidate(client):
    response = client.get("/api/open-prompts/current", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload is not None
    assert payload["category"] in {
        "mood",
        "nutrition",
        "location",
        "relationships",
        "health",
        "finance",
        "consumption",
    }
    assert payload["targetPage"] in {
        "therapist",
        "nutrition",
        "location",
        "relationships",
        "health",
        "finance",
        "consumption",
    }


def test_dismissing_prompt_allows_next_candidate(client):
    first = client.get("/api/open-prompts/current", headers={"X-API-Key": "dev-secret-key"})
    assert first.status_code == 200
    first_payload = first.json()
    assert first_payload is not None

    dismissed = client.post(
        f"/api/open-prompts/{first_payload['promptKey']}/dismiss",
        headers={"X-API-Key": "dev-secret-key"},
    )
    assert dismissed.status_code == 200

    second = client.get("/api/open-prompts/current", headers={"X-API-Key": "dev-secret-key"})
    assert second.status_code == 200
    second_payload = second.json()
    if second_payload is not None:
        assert second_payload["promptKey"] != first_payload["promptKey"]
