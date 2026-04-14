# Phase 3 Checklist

This checklist tracks the live-data rollout for Therapist OS.

## 1. Truth And Data Integrity

- Verify every major page against the live backend
- Confirm empty states are honest and useful when data is sparse
- Confirm sync activity reflects the real backend state
- Confirm source status text matches actual backend state
- Confirm scheduler remains healthy after restart

## 2. Mind AI

- Confirm the local provider is reachable from the app
- Confirm therapist chat works end to end with the configured model
- Confirm chat history persists in the correct dataset
- Confirm cost tracking is updated only at message time
- Confirm error states are honest when the local model is unavailable or slow

## 3. Habits Page

- Keep the page focused on today-first logging
- Make streaks and completion feel motivating without being noisy
- Highlight the highest-leverage habits
- Confirm history and streaks update correctly

## 4. People Page

- Keep the page focused on logging contact and spotting drift
- Make empty states useful instead of barren
- Confirm imports and interaction logs reflect the active dataset

## 5. Nutrition Removal

- Keep Nutrition removed from the active navigation and app routes
- Drop archived Nutrition tables only after explicit approval for a destructive migration

## 6. Spotify / Media Core

- Confirm raw Spotify event capture is stable
- Confirm the cursor moves correctly
- Confirm daily summaries rebuild from raw events
- Confirm source filtering feels clean and obvious

## 7. Google Takeout Product Import

- Inspect the Google Takeout structure already available in Drive
- Confirm exact files for YouTube watch history and Google search history
- Build parsers and keep imports idempotent where possible

## 8. Phase 3 QA And Exit Criteria

- Run frontend tests
- Run backend Docker tests
- Run Playwright visual checks
- Do a manual browser pass
- Confirm the app is truthful, Mind works, Habits feels strong, and People feels strong
