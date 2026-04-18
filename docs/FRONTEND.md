# Frontend

## Purpose

The frontend is a mobile-first Next.js PWA that acts as the daily interface for Therapist OS.

It is designed to:
- feel like a personal product rather than an admin console
- keep state transitions smooth and readable on mobile
- let the user inspect both their life data and the Brain that interprets it

## Main Frontend Areas

- `frontend/app`
  App entry, layout, global styles
- `frontend/components`
  Product UI grouped by feature area
- `frontend/state`
  Zustand stores for session state, settings, check-ins, and relationships
- `frontend/lib`
  API client, brain blueprint data, date/domain utilities
- `frontend/hooks`
  Shared frontend hooks like API query handling

## Key Screens

- `DashboardPage`
  Home surface for insights and domain entry points
- `BrainPage`
  Frontend blueprint for the Brain architecture
- `TherapistPage`
  Async and live therapist interactions
- `HabitsPage`
  Identity-first habit experience with hold-to-complete bubbles
- Domain pages
  Health, Relationships, Finance, Consumption, Location
- `SettingsPage`
  Local intelligence summary, data source connections, appearance, privacy

## Design System Notes

The app uses:
- CSS design tokens in `globals.css`
- Tailwind utility classes
- a serif display font for headings and display moments
- soft rounded cards and mobile-first spacing

Typography direction:
- display serif for major headings and intentional moments
- clean sans-serif for controls, body copy, labels, and utility UI

## Data Flow

The frontend now prefers API-backed flows rather than local mock imports.

Typical flow:
1. screen calls methods from `frontend/lib/api.ts`
2. `useApiQuery` or store hydration loads data
3. screen renders loading, success, or retry states
4. optimistic updates are used selectively for smoother interaction

## Brain UI

The Brain page is currently a product-facing architecture map.

It explains:
- the 10 layers of the Brain
- their detector/model blueprint
- how the system should evolve from version to version

It does not yet mean every layer is fully implemented server-side.

## Important Frontend Files

- `frontend/components/AppShell.tsx`
- `frontend/components/dashboard/DashboardPage.tsx`
- `frontend/components/brain/BrainPage.tsx`
- `frontend/components/therapist/TherapistPage.tsx`
- `frontend/components/settings/SettingsPage.tsx`
- `frontend/components/habits/HabitsPage.tsx`
- `frontend/lib/api.ts`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`

## Current Priorities

- keep API-backed domain screens stable
- keep the Brain and Settings aligned with the private local-AI direction
- improve typography and UI consistency across all surfaces
- make new frontend states resilient when backend calls fail
