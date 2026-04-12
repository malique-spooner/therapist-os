# Real/Demo Truth Audit

Last updated: 2026-04-12

## Current Assessment

The active product surfaces are API-backed and mode-aware. Demo and Real are separate app databases at the UI level: Real reads real tables only, and Demo reads demo tables only.

## Page Status

| Page | Real-only status | Demo-only status | Notes |
|---|---|---|---|
| Dashboard | Partial | Working | Real mode waits for backend readiness and hides demo snapshot cards. Needs browser pass with sparse real data. |
| Mind / Therapist | Partial | Working | Conversation infrastructure exists. Needs live local-model verification and honest slow/offline states. |
| Habits | Partial | Working | API-backed and real-mode empty state exists. Needs product polish and real logging QA. |
| People | Partial | Working | Demo insights are gated to demo mode. Real mode hides demo people and prompts for real people/interactions. Needs real interaction logging QA. |
| Spotify / Media | Partial | Working | Static insight cards are demo-gated. Needs real Spotify sync verification and YouTube truth pass. |
| Health | Partial | Working | Static insight cards are demo-gated. Needs real Garmin/live source verification. |
| Money | Partial | Working | Static insight cards are demo-gated. Needs TrueLayer/live money verification. |
| Places / Location | Active validation | Working | New backend-driven page is deployed. OwnTracks real points are arriving. Needs walk test and Google Maps key confirmation. |

## Mock/Data Helper Audit

- `src/lib/domainData.ts` is now explicitly marked as legacy demo helper code.
- `TodaySnapshot` uses `domainData.ts`, but Dashboard only renders it in `demo-only`.
- `RelationshipInsights` is only rendered in `demo-only` and no longer imports unused static data arrays.
- Health, Finance, and Consumption static insight cards are gated to `demo-only`.
- Location now uses backend intelligence for the active page; older location helper components remain in the tree but are not the active Location page path.
- Nutrition has been removed from the active frontend, API client, navigation, dashboard entry points, visual checks, and open-prompt nudges. Historical backend tables and migrations remain archived until an explicit destructive database migration is requested.
- Demo data is a living sandbox: startup seeding keeps a rolling 90-day window, and scheduler jobs refresh demo sync attempts on the same cadence as the corresponding real sources.

## Verified This Pass

- Frontend tests pass with same-origin cookie-auth expectations.
- Production build passes.
- Live `/readyz` reports database OK.
- Live VPS services are running.
- OwnTracks real ingest is successful and storing rows.

## Remaining Manual QA

- Browser pass in `real-only` across every page.
- Browser pass in `demo-only` across every page.
- Confirm source status wording in Settings for Spotify, Weather, Garmin, Google Drive, OwnTracks, and TrueLayer.
- Confirm sync activity rows match actual backend records and cooldowns.
