# AGENTS.md
# ASCEND.EXE — Tactical Performance System

## Project Identity

ASCEND.EXE is a single-activity performance tracking web app built with:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Dark cyberpunk aesthetic
- Cold military AI tone

This is a clean consumer product, not a configurable engineering tool.

The interface must feel:
- Precise
- Controlled
- Minimal
- High-contrast
- Tactical

No playful tone. No emojis. No casual phrasing.

---

## Core Product Principles

1. Single Primary Activity per user.
2. Full XP transparency.
3. XP decay on inactivity.
4. No XP loss on failure (reduced yield instead).
5. Rank promotion and demotion possible.
6. Directives scale after promotion.
7. Discipline Index affects progression.

Avoid feature creep.

Do not add:
- Leaderboards
- Social features
- Advanced analytics dashboards
- Graph-heavy UIs
- Over-configuration

---

## Design System Rules

### Visual

- Background: true black
- Primary accent: cyan
- Secondary accent: subtle purple (sparingly)
- No rounded corners unless explicitly specified
- Minimal gradients
- Sharp borders
- Monospace typography preferred

### Tone

All system messages must:

- Use short declarative sentences.
- Avoid exclamation marks.
- Avoid praise-heavy language.
- Sound like a military diagnostic system.

Example tone:

> SESSION PROCESSED.  
> PERFORMANCE WITHIN THRESHOLD.  
> DISCIPLINE VARIANCE DETECTED.

Never write:

> Great job!  
> You crushed it!

---

## Architecture Constraints

Keep components modular and simple.

Preferred structure:
src/
app/
dashboard/
log/
directives/
components/
layout/
modules/
system/
lib/
xp/
discipline/
ranks/


Do not over-abstract early.
Do not introduce complex state management libraries prematurely.
Prefer built-in React patterns and server components where possible.

---

## XP System Rules

Session XP formula:

SessionXP = round(
  BaseRate ×
  IntensityMultiplier ×
  DurationMultiplier ×
  OutcomeMultiplier ×
  ConsistencyMultiplier
)

XP decay:
- Begins after grace window based on expected frequency.
- 2% of total XP per inactive day.
- Cannot reduce below 85% of current level start.

Rank demotion requires:
1. XP below threshold
2. Discipline = COMPROMISED for 7 consecutive days

All XP values must be visible to the user.

---

## Discipline Index

States:
- OPTIMAL
- STABLE
- DECLINING
- COMPROMISED

Recovery only through action.
Never passive recovery.

---

## Code Style Expectations

- TypeScript strict mode.
- Clear type definitions.
- No `any` unless absolutely required.
- Keep functions pure when possible.
- Separate calculation logic from UI.
- Place XP logic inside `/lib/xp`.

All calculations must be deterministic and testable.

---

## When Generating UI Code

- Use Tailwind.
- Avoid excessive wrapper divs.
- Use semantic HTML where possible.
- Keep spacing consistent.
- Avoid unnecessary animations.

Animations should be:
- Subtle
- Purpose-driven
- Not decorative

---

## When Generating Features

Before adding a new feature:
1. Confirm it aligns with core product principles.
2. Confirm it does not introduce feature creep.
3. Keep MVP minimal.

If unsure, default to simpler implementation.

---

## Long-Term Vision (Do Not Implement Yet)

Future phases may include:
- Multi-activity hybrid tracking
- Public build profiles
- Exportable performance summary
- Audio feedback

These are not part of MVP.

---

END OF DIRECTIVE.