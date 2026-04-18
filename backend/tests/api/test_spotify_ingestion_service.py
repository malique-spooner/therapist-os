from app.services.ingestion.spotify import SpotifyIngestionService


class _FakeSpotifyClient:
    def __init__(self) -> None:
        self.requested_track_ids: list[str] = []

    def audio_features(self, track_ids):
        self.requested_track_ids = list(track_ids)
        raise RuntimeError("audio features blocked")


def test_fetch_audio_features_deduplicates_and_falls_back_cleanly():
    client = _FakeSpotifyClient()
    service = SpotifyIngestionService({"client_id": "a", "client_secret": "b", "refresh_token": "c"})

    features = service._fetch_audio_features(client, ["track-1", "track-2", "track-1"])

    assert features == {}
    assert client.requested_track_ids == ["track-1", "track-2"]
