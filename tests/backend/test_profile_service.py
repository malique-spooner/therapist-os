from backend.services.profile_service import ProfileService


def test_profile_refresh_updates_profile_fields(db_session):
    service = ProfileService()

    profile = __import__("asyncio").run(service.update_profile(db_session))

    assert "## Personal Context" in profile.profile_document
    assert profile.key_themes
    assert profile.notable_patterns
    assert profile.health_baseline["steps"] > 0
