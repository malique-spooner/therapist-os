# Data Architecture

Therapist OS now runs a **single live dataset**.

The guiding rule is simple:

- all user-facing life data is stored in real tables only
- raw imports remain separate as the traceable intake layer
- app/runtime state stays in shared tables when it is not life history

## Core Tables

Canonical live tables include:

- `health_data`
- `finance_data`
- `music_data`
- `weather_data`
- `nutrition_log`
- `daily_checkins`
- `habit_logs`
- `relationships`
- `relationship_interactions`
- `relationship_screenshot_imports`
- `location_data`
- `location_daily_summary`
- `location_companion_logs`
- `user_profile`
- `monthly_budget`
- `ai_conversations`

## Shared Tables

These remain global app state:

- `data_source_connections`
- `habits`
- `app_open_prompt_states`

## Import Flow

1. Source files and API payloads land in raw import tables.
2. Importers normalise and dedupe the incoming rows.
3. Cleaners write the final data into the canonical live tables.
4. Derived summaries are recomputed from those live tables.

## Invariant

The backend should read and write live tables directly. There is no demo fallback path left in the product.
