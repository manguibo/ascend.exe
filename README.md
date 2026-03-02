# ASCEND.EXE

Tactical single-activity performance tracking system.

This repository contains the ASCEND.EXE web application built with Next.js, TypeScript, Tailwind CSS, and a tactical high-contrast interface.

## Repository Layout

- `app/`: Next.js application codebase (App Router)
- `AGENTS.md`: project directives for product, architecture, and tone

## Product Scope (MVP)

- Single primary activity per user
- Transparent XP calculation and decay visibility
- Discipline state tracking (`OPTIMAL`, `STABLE`, `DECLINING`, `COMPROMISED`)
- Rank progression with possible demotion conditions
- Body recovery interface with clickable muscle focus and recovery guidance

## Quick Start

1. Open a terminal in `app/`.
2. Install dependencies:

```bash
npm install
```

3. Start development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Verification Commands

Run from `app/`:

```bash
npm run lint
npm run test
```

## Notes

- Intro cutscene plays on app open and can be skipped.
- Body recovery diagram supports region click-to-focus and guidance-driven focus selection.
- Keep feature changes aligned with `AGENTS.md` to avoid scope creep.
