def test_dashboard_returns_expected_shape(client):
    response = client.get("/api/dashboard?period=this-week", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["greeting"]
    assert payload["heroInsight"]["heroHeadline"]
    assert len(payload["rings"]) == 3
    assert any(card["category"] == "Environment" for card in payload["insights"])
    assert {trend["label"] for trend in payload["miniTrends"]} == {"Sleep", "Steps", "Spend"}
