# Therapist OS

A personal AI-powered psychological intelligence PWA. Therapist OS surfaces behavioural patterns across your health, finance, habits, and location data, then gives you a private AI therapist to work through them — grounded in CBT, SDT, Behaviourism, and Interpersonal Therapy (IPT).

> Built as a mobile-first PWA. Install it to your home screen for the full experience.

---

## Features

- **Dashboard** — weekly insights across health, finance, and habits with framework-tagged analysis (CBT / SDT / Behaviourism / IPT)
- **AI Therapist** — private async or live-mode conversation with your own therapist, context-aware from your dashboard
- **Habits** — daily habit tracking with streaks, completion heatmaps, and progress rings
- **Relationships** *(coming Phase 2)* — IPT-based relationship mapping and interaction logging

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| Animation | Framer Motion |
| State | Zustand (with persist middleware) |
| UI components | shadcn/ui |
| Icons | Lucide React |
| Charts | Recharts |
| PWA | next-pwa |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 2 Backend

The repo now includes a FastAPI backend, Alembic migrations, Docker Compose, and a Postgres-first local workflow.

### 1. Create your env file

```bash
cp .env.example .env
```

For local frontend development, the important public values are:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=dev-secret-key
```

### 2. Run the backend with Docker Compose

```bash
docker compose up --build
```

The API and scheduler containers now bootstrap themselves by:

- applying Alembic migrations
- seeding demo data when `SEED_DEMO_DATA=true`
- starting the API or scheduler process

The backend health check is available at [http://localhost:8000/healthz](http://localhost:8000/healthz).

### 3. Run the frontend against the backend

In a second terminal:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard, habits, therapist, provider list, and budget widget now read from the backend API.

### 4. Local Python workflow without Docker

After creating a Python 3.11 environment and installing `backend/requirements.txt`:

```bash
python -m backend.bootstrap
uvicorn backend.main:app --reload
```

`backend.bootstrap` is the local setup step. It applies Alembic migrations and seeds demo data when enabled.

### Testing

Frontend tests run locally with:

```bash
npm test
```

Backend tests are intended to run in the Python 3.11 Docker image:

```bash
docker compose run --rm backend-tests
```

That avoids host-Python drift and keeps backend test execution aligned with the deployed runtime.

## Reliability & Safety

The repo now includes:

- structured JSON logging with request IDs
- liveness and readiness endpoints
- centralized exception handling
- environment validation warnings at startup
- ntfy notification error surfacing
- backup and restore scripts for Postgres
- CI for frontend tests/build and backend Docker-based tests

Operational docs live in:

- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/PRIVACY.md](docs/PRIVACY.md)

### Other commands

```bash
npm run build    # production build
npm run lint     # ESLint
npm run format   # Prettier
```

## Project Structure

```
src/
├── app/           # Next.js App Router (layout, globals.css)
├── components/    # UI components by feature
│   ├── dashboard/
│   ├── habits/
│   ├── therapist/
│   ├── navigation/
│   └── settings/
├── data/          # Mock/seed data (health, finance, habits, insights)
├── lib/           # Utility functions
├── services/ai/   # AI service abstraction layer
└── store/         # Zustand stores (settings, session, habits)
```

```text
backend/
├── main.py
├── bootstrap.py
├── scheduler.py
├── models/
├── routers/
├── services/
└── alembic/
```

## Psychology Frameworks

The app applies four evidence-based frameworks to surface insights:

| Framework | Focus |
|---|---|
| **CBT** | Identifying and challenging negative thought patterns |
| **SDT** | Understanding autonomy, competence, and relatedness needs |
| **Behaviourism** | Recognising how consequences shape behaviour |
| **IPT** | Mapping relationship patterns as the root of wellbeing |

## Current Phase 2 Status

- [x] FastAPI backend scaffold with Docker Compose, Postgres service, API key auth, and Alembic baseline
- [x] Live API integration for the currently implemented frontend surfaces: dashboard, habits, therapist, providers, and budget
- [x] Real weather ingestion endpoint and scheduler hook
- [x] Ntfy-based notification service and scheduler jobs
- [ ] Real AI provider integration
- [ ] Garmin / TrueLayer / Spotify / OwnTracks ingestion
- [ ] Live voice pipeline and remaining ingestion jobs

## License

MIT — see [LICENSE](LICENSE).
