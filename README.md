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

## Psychology Frameworks

The app applies four evidence-based frameworks to surface insights:

| Framework | Focus |
|---|---|
| **CBT** | Identifying and challenging negative thought patterns |
| **SDT** | Understanding autonomy, competence, and relatedness needs |
| **Behaviourism** | Recognising how consequences shape behaviour |
| **IPT** | Mapping relationship patterns as the root of wellbeing |

## Roadmap

- [ ] Phase 2: Connect real AI providers (Claude, Gemini, Groq)
- [ ] Phase 2: Ingest live data (Garmin, TrueLayer, Spotify, Google Calendar)
- [ ] Phase 2: Relationship Tracker with full IPT tooling
- [ ] Phase 3: Longitudinal insight graphs
- [ ] Phase 3: Voice-first live sessions

## License

MIT — see [LICENSE](LICENSE).
