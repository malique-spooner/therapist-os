def test_profile_themes_and_patterns_endpoints(client):
    themes_response = client.get("/api/profile/themes", headers={"X-API-Key": "dev-secret-key"})
    patterns_response = client.get("/api/profile/patterns", headers={"X-API-Key": "dev-secret-key"})

    assert themes_response.status_code == 200
    assert patterns_response.status_code == 200

    themes = themes_response.json()["themes"]
    patterns = patterns_response.json()["patterns"]

    assert isinstance(themes, list)
    assert isinstance(patterns, list)
    assert themes
    assert patterns


def test_profile_and_budget_support_mode_split(client):
    demo_profile = client.get("/api/profile?mode=demo-only", headers={"X-API-Key": "dev-secret-key"})
    real_profile = client.get("/api/profile?mode=real-only", headers={"X-API-Key": "dev-secret-key"})
    demo_budget = client.get("/api/budget/current?mode=demo-only", headers={"X-API-Key": "dev-secret-key"})
    real_budget = client.get("/api/budget/current?mode=real-only", headers={"X-API-Key": "dev-secret-key"})

    assert demo_profile.status_code == 200
    assert real_profile.status_code == 200
    assert demo_budget.status_code == 200
    assert real_budget.status_code == 200
    assert demo_budget.json()["spentPence"] != real_budget.json()["spentPence"]
