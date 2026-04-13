# Data Architecture

Therapist OS currently uses one physical database, but it should behave like **two logical databases**:

- `demo-only`
- `real-only`

The rule is:

- user-facing life data must be separated by mode
- shared infrastructure state can stay global only if it is not pretending to be life data

## Split Tables

These tables now participate in the demo/real split through `is_demo`:

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

These stay global for now because they represent app/runtime state rather than demo life history:

- `data_source_connections`
- `habits`
- `app_open_prompt_states`

Notes:

- `habits` are treated as the canonical habit definitions shared by both datasets
- data-source credentials are always real app configuration, not demo content

## Page Mapping

- Dashboard: aggregates split domain tables and must honor mode end to end
- Health: `health_data`
- Finance: `finance_data`, `monthly_budget`
- Consumption: `music_data`
- Location: `location_data`, `location_daily_summary`, `location_companion_logs`
- Nutrition: `nutrition_log`
- Relationships: `relationships`, `relationship_interactions`, `relationship_screenshot_imports`
- Therapist: `ai_conversations`, `ai_messages`, `monthly_budget`, contextual reads from split domain/profile tables
- Brain: derived overview using split tables plus shared source configuration

## Invariant

If a page is in `real-only`, it should never need frontend fallbacks to hide demo records. The backend query path should already be scoped correctly.
