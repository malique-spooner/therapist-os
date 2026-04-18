# Location Deploy Readiness

## What Is Done

- OwnTracks now uses the public HTTPS webhook flow through nginx.
- OwnTracks ingestion accepts raw location points plus waypoint/geofence-style events.
- Backend place inference is the source of truth for visits, place memory, recap scenes, confidence, and lifecycle state.
- Place memory supports rename, merge, split, history, and confidence-aware status.
- The Location page consumes backend intelligence rather than rebuilding place logic in the browser.
- Weekly recap scenes now drive animated Google Maps camera movement instead of simple scene snapping.
- Google Maps settings are configurable through the app.

## Verified Locally

- Targeted backend test suite passes in Docker:

```bash
docker compose run --rm -e PYTHONPATH=/app backend-tests pytest backend/tests/api/test_location_router.py backend/tests/api/test_data_sources_router.py backend/tests/api/test_ai_router.py -q
```

- Result at last run:

```text
41 passed, 1 warning in 32.16s
```

## Still Required After Deploy

- Save the real Google Maps browser API key in Settings.
- Save fresh OwnTracks webhook credentials in Settings.
- Configure the phone's OwnTracks app to use the public webhook URL with HTTP mode and Basic auth.
- Send a real publish from the phone and confirm live traces/events on the Location page.

## Production Steps

1. Apply the Alembic migration for location place memory/history/events.
2. Redeploy backend and frontend together.
3. Restart nginx if an upstream cache issue appears after container recreation.
4. Enter the Google Maps key in Settings.
5. Validate OwnTracks end to end with a real phone publish.
