# Product Roadmap

This roadmap reflects the current agreed direction for Therapist OS.

It separates:
- core product quality
- live web deployment
- real data acquisition
- native mobile work
- the later Brain layer

## Phase 3: Core Product

Goal:
- make the app truthful, coherent, and worth using every day

Includes:
- finish truth and data-integrity work across the app
- make Mind AI work properly
- improve the Habits page
- improve the People page
- keep Spotify solid as a core source
- remove Nutrition from the active product surface for now
- add Google Takeout import for:
  - YouTube watch history
  - Google search history

Success criteria:
- `real-only` tells the truth everywhere
- the core pages are useful even with sparse data
- Mind, Habits, People, and Spotify feel like real product surfaces
- YouTube and Search history can be imported from Takeout

Execution checklist:
- [docs/PHASE_3_CHECKLIST.md](docs/PHASE_3_CHECKLIST.md)

## Phase 4: VPS / Live Web App

Goal:
- make Therapist OS the real always-on web app

Includes:
- VPS deployment
- HTTPS and domain setup
- background jobs running reliably in production
- app accessible anywhere in the browser, including on iPhone

Important:
- this is live web deployment
- it is not yet the native iPhone app phase

Success criteria:
- the app is reliably reachable from anywhere
- background sync jobs run on the VPS
- deployment and operational flow are stable

## Phase 5: Real Data Layer

Goal:
- deepen the amount of real data available to the app

Includes:
- Money page work
- Places and location work
- historical backfill workflows for older personal data, including:
  - old Spotify data
  - old Google Takeouts
  - Apple Health export or Garmin export as one-off backfill sources

Important:
- this phase includes one-off or operator-driven historical backfill
- it is different from permanent product import features

Success criteria:
- the database contains enough real history to support more meaningful patterns
- Money and Places are materially more useful
- older personal data can be backfilled cleanly without hard-coding it into the product

## Phase 6: Native iPhone Layer

Goal:
- turn Therapist OS into a real iPhone app when it is worth doing

Includes:
- Apple Developer setup
- choosing the app-shell or native approach
- building the iPhone app layer
- HealthKit integration
- other native device features where useful

Important:
- this is the phase where the app itself can become the Health bridge
- it is separate from simple VPS deployment

Success criteria:
- Therapist OS can run as a real iPhone app
- HealthKit integration is possible through the app itself
- the product is no longer limited to browser-only behavior on iPhone

## Phase 7: Brain

Goal:
- build the real intelligence layer on top of live and backfilled data

Includes:
- cross-domain joins
- pattern detection
- correlation and context logic
- therapist-context improvements
- real Brain outputs and insight generation

Success criteria:
- the Brain works from real personal history
- insights reflect actual cross-domain understanding rather than static scaffolding

## Notes

- Product import features and historical backfill are separate concepts.
- Google Takeout for YouTube and Search is part of the product in Phase 3.
- Older personal archives used to seed the database belong to Phase 5.
- VPS deployment and native iPhone deployment are separate phases.
