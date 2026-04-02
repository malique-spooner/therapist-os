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
