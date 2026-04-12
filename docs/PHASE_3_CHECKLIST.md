# Phase 3 Checklist

This is the execution checklist for Phase 3 of Therapist OS.

Phase 3 goal:
- make the app truthful, coherent, and worth using every day

## 1. Truth And Data Integrity

### 1.1 Real vs Demo Audit
- [ ] Verify every major page in `real-only` mode:
  - [ ] Dashboard
  - [ ] Mind / Therapist
  - [ ] Habits
  - [ ] People
  - [ ] Spotify / Media
  - [ ] Health
  - [ ] Money
  - [ ] Places
- [ ] Verify every major page in `demo-only` mode:
  - [ ] Dashboard
  - [ ] Mind / Therapist
  - [ ] Habits
  - [ ] People
  - [ ] Spotify / Media
  - [ ] Health
  - [ ] Money
  - [ ] Places
- [ ] Remove any remaining fake helper payloads from `real-only` paths
- [ ] Confirm empty states are honest and useful when real data is sparse
- [ ] Confirm the sync activity page reports demo and real datasets accurately

### 1.2 Data Source Truthfulness
- [ ] Confirm source status text matches actual backend state for:
  - [ ] Spotify
  - [ ] Weather
  - [ ] Garmin
  - [ ] Google Drive
  - [ ] OwnTracks
  - [ ] TrueLayer
- [ ] Confirm intended sync labels are accurate in Settings
- [ ] Confirm manual sync is disabled where it should be disabled
- [ ] Confirm sync attempt history records trigger, status, and cooldown truthfully

### 1.3 Scheduler And Background Reliability
- [ ] Confirm scheduler remains healthy after restart
- [ ] Confirm Spotify background sync continues to run on schedule
- [ ] Confirm Garmin background path stays throttled and does not retry during cooldown
- [ ] Confirm weather background sync still works

## 2. Mind AI

### 2.1 Local AI Reliability
- [ ] Confirm the local provider is reachable from the app
- [ ] Confirm therapist chat works end to end with the actual configured model
- [ ] Confirm chat history persists forever in the correct dataset
- [ ] Confirm cost tracking is updated only at message time
- [ ] Confirm error states are honest when the local model is unavailable or too slow

### 2.2 Mind UX
- [ ] Improve loading and failure messaging on the therapist page
- [ ] Make the opening message feel intentional and useful
- [ ] Make session history and conversation switching feel stable
- [ ] Reduce any remaining fake or placeholder therapist behavior in `real-only`

## 3. Habits Page

### 3.1 Product Clarity
- [ ] Decide the primary jobs of the habits page:
  - [ ] logging today
  - [ ] seeing momentum
  - [ ] spotting weak points
  - [ ] reinforcing consistency
- [ ] Tighten the page structure around those jobs

### 3.2 Behavior Design
- [ ] Keep a small, clear “today first” interaction flow
- [ ] Make streaks and completion feel motivating without being noisy
- [ ] Highlight the highest-leverage habits instead of treating all habits equally
- [ ] Improve day vs range views if needed
- [ ] Make sparse real-data states still useful for logging

### 3.3 QA
- [ ] Test habits logging in `demo-only`
- [ ] Test habits logging in `real-only`
- [ ] Confirm history and streaks update correctly

## 4. People Page

### 4.1 Product Clarity
- [ ] Define the primary jobs of the people page:
  - [ ] log contact
  - [ ] review closeness and cadence
  - [ ] see who is drifting
  - [ ] prepare for future import automation
- [ ] Simplify the page around those jobs

### 4.2 UX Improvements
- [ ] Make empty `real-only` state useful instead of barren
- [ ] Improve interaction logging flow
- [ ] Improve person cards and relationship overview
- [ ] Prepare the UI for future screenshot-import matching without overbuilding it now

### 4.3 Data Truthfulness
- [ ] Confirm demo people never leak into `real-only`
- [ ] Confirm imports and interaction logs only reflect the active dataset

## 5. Nutrition Removal

### 5.1 Active Surface
- [x] Remove Nutrition from the “active focus” of Phase 3
- [x] Remove the frontend Nutrition page, store, demo data, nav item, and dashboard entry points
- [x] Remove Nutrition open-prompt nudges and API-client methods

### 5.2 Backend Handling
- [x] Remove the active router from the FastAPI app
- [ ] Drop archived Nutrition tables and migrations only after explicit approval for a destructive database migration

## 6. Spotify / Media Core

### 6.1 Spotify Ingestion
- [ ] Confirm raw Spotify event capture is stable
- [ ] Confirm `after` cursor moves correctly
- [ ] Confirm daily summaries rebuild correctly from raw events
- [ ] Confirm scheduler-based Spotify sync works on cadence

### 6.2 Spotify Page UX
- [ ] Make the first media panel strong and useful for selected day/range
- [ ] Improve top songs presentation
- [ ] Add or improve top artists view
- [ ] Improve date-range behavior on media charts
- [ ] Make provider filtering feel clean and obvious

### 6.3 Real vs Demo
- [ ] Confirm Spotify real data is shown honestly
- [ ] Confirm YouTube does not pretend to have real data yet

## 7. Google Takeout Product Import

### 7.1 Import Discovery
- [ ] Inspect the Google Takeout structure already available in Drive
- [ ] Confirm exact files for:
  - [ ] YouTube watch history
  - [ ] Google search history
- [ ] Decide whether import should read directly from Drive-downloaded archives or extracted files

### 7.2 Backend Import Pipeline
- [ ] Build parser for YouTube watch history
- [ ] Build parser for Google search history
- [ ] Map imported records into normalized real tables
- [ ] Record import activity and provenance
- [ ] Make imports idempotent where possible

### 7.3 Product UI
- [ ] Add import flow/status in the app
- [ ] Show imported YouTube data on the Media page
- [ ] Decide where Google Search history should surface

## 8. Phase 3 QA And Exit Criteria

### 8.1 QA Pass
- [ ] Run frontend tests
- [ ] Run backend Docker tests
- [ ] Run Playwright visual checks
- [ ] Do a manual browser pass in `real-only`
- [ ] Do a manual browser pass in `demo-only`

### 8.2 Exit Criteria
- [ ] The app is truthful in both modes
- [ ] Mind works
- [ ] Habits feels strong
- [ ] People feels strong
- [x] Nutrition is removed from active navigation and app routes
- [ ] Spotify is a dependable core source
- [ ] Google Takeout imports for YouTube and Search are usable

## Suggested Working Order

1. Truth and data integrity
2. Mind AI
3. Habits page
4. People page
5. Nutrition removal
6. Spotify/media polish
7. Google Takeout import
8. Final QA and Phase 3 signoff
