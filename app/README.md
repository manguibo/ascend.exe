# ASCEND.EXE App

Next.js application for ASCEND.EXE tactical performance tracking.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Three.js + React Three Fiber + Drei
- Vitest

## Run Locally

From this `app/` directory:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Core Routes

- `/`: Home
- `/dashboard`: Performance overview
- `/log`: Session logging flow
- `/directives`: Directive view
- `/settings`: User settings

## Current Key Features

- Tactical startup cutscene overlay on app entry with skip control
- XP and decay system with transparent multipliers and rank thresholds
- Discipline index state modeling and recovery-through-action behavior
- 3D body recovery interface with per-muscle selection
- Clickable recovery guidance entries that focus the selected muscle
- Muscle details panel with activity label context for stress rationale

## Architecture Notes

- UI components: `components/system/`
- App routes and page composition: `app/`
- Deterministic domain logic:
  - XP: `lib/xp/`
  - Ranks: `lib/ranks/`
  - Directives: `lib/directives/`
  - System simulation/state: `lib/system/`

## Quality Checks

Run before pushing:

```bash
npm run lint
npm run test
```

## Product Guardrails

Changes should follow repository directives in `../AGENTS.md`:

- Keep single-activity product focus
- Maintain deterministic, testable calculations
- Avoid feature creep and unnecessary complexity
- Preserve tactical, concise UI tone
