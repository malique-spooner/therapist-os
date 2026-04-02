# Coding Pass

This document defines what a **coding pass** means for Therapist OS.

It is not a changelog for one specific edit. It is the repeatable checklist to run **after the key features are written** and before work is considered properly finished.

## Purpose

A coding pass happens after feature work is mostly done.

Its goal is to make the project:

- cleaner
- safer
- easier to understand
- easier to maintain
- better tested
- better documented
- more production-ready

In simple terms:

- feature pass = make it work
- coding pass = make it solid

## When To Run It

Run a coding pass when:

- a major feature or feature group has been implemented
- a page or flow is “working” but still feels rough internally
- before pushing an important milestone
- before deployment
- before asking for review

## Coding Pass Checklist

### 1. Clean The Code

- remove dead code
- remove unused props, branches, variables, imports, and helpers
- remove duplicated logic where a shared helper or component makes sense
- simplify overly large functions
- split oversized components or modules if they are getting hard to reason about
- improve naming so intent is obvious
- tighten types and reduce vague typing

### 2. Check Logic Safety

- inspect optimistic updates and state sync carefully
- check edge cases and empty states
- check failure and retry behavior
- make sure fallbacks behave intentionally
- verify async flows do not leave the UI in a broken or stale state
- confirm dangerous or sensitive operations are guarded properly

### 3. Improve Maintainability

- add small comments where the code would otherwise be genuinely hard to follow
- avoid unnecessary comments for obvious code
- extract shared UI patterns when repetition appears in multiple places
- reduce one-off inline logic if it is repeated elsewhere
- make sure important constants and labels are centralized where sensible

### 4. Improve Safety And Reliability

- make sure errors fail clearly and safely
- confirm sensitive data is not being logged
- check that secrets are not hard-coded
- confirm APIs and integration points have sane fallbacks
- verify request/retry states are consistent
- make sure migrations, startup scripts, and operational code still make sense

### 5. Complete Tests

- add tests for the new behavior
- update broken or outdated tests
- add regression tests for bugs fixed during the pass
- test accessibility-critical interactions where possible
- verify the main frontend flows still pass
- verify backend tests still pass

### 6. Verify The Build

- run frontend tests
- run backend tests
- run the production build
- confirm there are no obvious runtime regressions
- check whether generated artifacts changed and whether that is expected

### 7. Complete Documentation

- update the main README if the project state changed
- update relevant docs in `/docs`
- add a new markdown doc if a new area now needs explanation
- make sure setup steps, build steps, and architecture notes are still accurate
- make sure docs match the current product direction, not an outdated one

### 8. Check Product Consistency

- make sure the feature matches the current product direction
- remove leftover UI or wording from earlier versions
- make sure titles, labels, and states are coherent across the app
- verify typography, spacing, and interactions still feel like the same product

### 9. Prepare For Push

- inspect the changed files
- make sure the diff is understandable
- keep unrelated noise out of the commit if possible
- use a clear commit message
- only push once the code, tests, and docs are in a good state

## Minimum Verification Commands

For this project, a proper coding pass should normally end with:

```bash
npm test
docker compose run --rm backend-tests
npm run build
```

If one of these cannot be run, that should be stated clearly before the work is treated as complete.

## Expected Output Of A Coding Pass

When a coding pass is finished, we should be able to say:

- the feature still works
- the code is cleaner than before
- the tests reflect the current behavior
- the docs are up to date
- the app is safer and easier to maintain

## Therapist OS Standard

For Therapist OS specifically, a coding pass should always pay extra attention to:

- privacy
- safety of sensitive data
- clarity of AI-related behavior
- consistency of fallback states
- quality of tests
- accuracy of markdown documentation

That is the standard for calling a feature truly finished here.
