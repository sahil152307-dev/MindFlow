# MindFlow — The Adaptive Student Planner

> A gentle, energy-aware planner for students whose brains work differently.
> Built for people dealing with ADHD, executive dysfunction, anxiety, and task paralysis —
> **it plans around your energy, never against it.**

**Next.js 16** · **Tailwind CSS 4** · **shadcn/ui** · **Prisma + SQLite** · **z-ai-web-dev-sdk (LLM + VLM)**

---

## Table of Contents

1. [Why MindFlow Exists](#why-mindflow-exists)
2. [The Anti-Shame Contract](#the-anti-shame-contract)
3. [Feature Highlights](#feature-highlights)
4. [The Five Adaptive Modes](#the-five-adaptive-modes)
5. [Reward Economy](#reward-economy)
6. [Tech Stack & PRD/TRD Mapping](#tech-stack--prdtrd-mapping)
7. [Architecture](#architecture)
8. [Data Model](#data-model)
9. [API Reference](#api-reference)
10. [Design System](#design-system)
11. [Project Structure](#project-structure)
12. [Getting Started](#getting-started)
13. [AI Behavior & Graceful Degradation](#ai-behavior--graceful-degradation)
14. [Accessibility & Sensory Safety](#accessibility--sensory-safety)
15. [Screenshots](#screenshots)
16. [Scope & Trade-offs](#scope--trade-offs)
17. [Contributing](#contributing)
18. [License](#license)

---

## Why MindFlow Exists

Every mainstream planner is built on the same assumption: that more pressure produces more output.
Red overdue badges, streak-loss warnings, rigid grids, alarm-driven reminders. For a neurotypical
brain that might work. For a student with ADHD, executive dysfunction, or anxiety, those same
mechanics do something else entirely — they trigger task paralysis, shame spirals, and eventually
complete app abandonment (or autistic burnout).

MindFlow is built on the opposite premise: **pressure is the bug, not the feature.**

It is designed around **Spoon Theory** — the idea that each day you wake up with a limited amount
of cognitive/physical energy ("spoons"), and that the right move is to spend those spoons
deliberately, not to fight the days where you have fewer of them. So the app asks how you're
*actually* doing, and shapes the day to fit — never the other way around.

---

## The Anti-Shame Contract

These rules are enforced in code, not just in copy. They shape what the UI is allowed to do:

| Rule | In practice |
| --- | --- |
| **Never red.** | There is no red color anywhere in the app — not for overdue, not for failure states. Due labels use warm honey/peach tones. |
| **No alarms, ever.** | No push notifications, no due-date sirens. The student comes to the app; the app never ambushed them. |
| **Energy is information, not failure.** | A low-energy check-in changes the plan, not the tone. "Low energy is information, not failure" is literal UI copy. |
| **Due dates stay fixed, tasks can move.** | Assignments keep honest due dates (a deadline is real). The *steps* toward them roll forward gently, and the app says so. |
| **Benefit of the doubt.** | Photo proofs always earn coins, even if the VLM verifier is unsure or offline. The system trusts the student. |
| **Rollover is tracked kindly.** | "Rolled 3x, no guilt" — rollovers are visible but framed as neutral information. |
| **Letting go is a first-class action.** | Every task has a "let it go" path with a confirm dialog that explains exactly what is and isn't lost. |

---

## Feature Highlights

### 1. Spoon Check-In
A daily Low / Medium / High energy check-in that maps to concrete capacity:

| Energy | Capacity | Plan shape |
| --- | --- | --- |
| Low | 2 spoons | Only 1-spoon micro-steps, 5-minute ceiling |
| Medium | 4 spoons | A light, mixed day |
| High | 7 spoons | A fuller day, urgency-weighted |

The check-in drives the plan generator (`/api/plan`) — a due-date-weighted scoring heuristic that
fills the day up to the current spoon budget, never beyond it.

### 2. AI Task Micro-Sequencer
The core differentiator. A real LLM breaks intimidating work into **microscopic, low-dopamine-threshold
steps** — each one an action verb, each one "embarrassingly small" (≤10 minutes; ≤5 minutes on low energy).

- Breakdowns are **energy-aware** (fewer, tinier steps when energy is low) and
  **blocker-aware** (different guidance for "too big" vs "where to start" vs "unclear instructions").
- Every step goes through **accept / edit / skip** — the student stays in control. The AI suggests; it never decides.
- If the LLM is unreachable, a **heuristic fallback** generates per-reason template steps, so a stuck
  student is never blocked by an outage. (See [AI Behavior](#ai-behavior--graceful-degradation).)

### 3. Gentle Rollover Engine
Rolling a task to tomorrow is one soft tap. No confirm-guilt, no penalty, and the task keeps a kind
`rolledCount` it displays neutrally ("rolled 2x, no guilt"). "Let it go" removes a task with an honest
explanation of what disappears and what doesn't. The "Taking its time" section on Today groups
unfinished work under this exact framing — there is no "Overdue" section in this app.

### 4. Visual Proof Dopamine Loop
Completing a task offers an optional photo proof ("Show your win · +10 Spoon Coins") — a picture of
the notebook page, the code editor, the solved problem set.

- The image is compressed in-browser (900px, 72% JPEG) before upload.
- A **VLM** reads it generously — blurry or partial photos count. Verification notes are displayed
  back to the student as encouragement.
- **Coins are always awarded.** If the VLM is unsure or down, the proof is auto-accepted. The loop
  exists to build momentum, not to police anyone.

### 5. Consistency → Tokens → Goodies
A week of consistent use (a "consistent day" = at least one completion) pays out **+7 tokens**.
The goodie shelf unlocks progressively — 150 / 200 / 250 / 300 tokens, with the flagship item at
**300 tokens** per the PRD. Claims are transactional: balance-checked, one-per-goodie, never negative.

### 6. Sensory-Safe Calm UI
Minimal, soothing, pastel-first design with a warm cream base, sage primary, and honey/rose/lilac/peach
accents. A warm-cocoa dark mode ("Evening") — deliberately not blue-black. Generous spacing, soft
shadows, rounded 1.125rem radii, and staggered, gentle motion. See [Design System](#design-system).

### 7. The Intelligence Layer (v2)

- **Smart Priority / Auto Planning** — a dedicated scoring engine (`src/lib/priority.ts`)
  where kindness is a weight: heavily-rolled tasks drift *down* (nagging is unkind) and point
  toward "shrink it" instead. Every suggestion carries 1–2 gentle "why" chips
  ("Gentle on a low-energy day", "Due in 1 day", "Rolled 3× — shrinking it might help").
- **"What should I do now?"** — the decision-paralysis valve. One tap returns ≤3 deduped
  options (the gentle one / the useful one / the five-minute one), time-of-day aware, with a
  soft sage glow that scrolls to the chosen card. If nothing is small enough, it offers to
  AI-shrink something instead.
- **AI Adaptive Recommendation ("Today's gentle read")** — an LLM reads the whole context
  (energy trend, streak, workload, mode habits) and writes one short, kind paragraph with a
  micro-action. Falls back to honest templates when offline — the read never disappears.
  "Not today" hides it until tomorrow.
- **Student Insights & Analytics** — "patterns, never grades": 14-day energy and completion
  charts (gaps are honest — no check-in is allowed), weekly mode usage, and rule-based gentle
  pattern lines. No red, no targets anywhere in the view.
- **Personalized Dashboard** — the Today header carries at-a-glance chips: n-day flow,
  open today, and X/Y spoons planned (turns soft peach when over capacity — never red).
- **Guided Demo Flow** — a 2-minute tour from the welcome screen that walks the real app
  (it genuinely navigates to Insights and Rewards), with skip-anytime copy: "nothing here is
  a test."

---

## The Five Adaptive Modes

The "What do you need right now?" strip meets the student where they are:

| Mode | Trigger | What it does |
| --- | --- | --- |
| **Plan My Day** | Neutral / starting out | Launches the check-in → suggest → accept flow; builds a spoon-shaped plan |
| **I'm Stuck** | Task paralysis | Pick a blocker (too big / where to start / unclear instructions) → pick the task → AI micro-breakdown with try/edit/skip per step |
| **Low Energy** | Running on empty | "Low energy is information, not failure." Suggests the single lightest open task, parks the heavy ones (spoon ≥ 2) to tomorrow, reassures that due dates stay fixed |
| **Motivated** | Rare good day | Choose a load ceiling (≤3 / ≤5 / ≤7 spoons) → urgency-sorted suggestions → "Momentum, not pressure" |
| **Rest** | Burnout prevention | Shows exactly what moves to tomorrow, then rolls everything with a "Today is officially soft" state and rest-affirming copy |

Mode usage is logged per week, so the Rewards view can show which tools the student is actually using —
framed as insight, never as a score.

---

## Reward Economy

All rules live in `src/lib/rewards.ts` and are applied transactionally:

| Event | Effect |
| --- | --- |
| Task completed | Counts toward consistency for the day |
| Photo proof uploaded (verified or trusted) | **+10 Spoon Coins** — always, even on benefit-of-the-doubt |
| 7 consecutive consistent days | **+7 tokens** payout, with a celebratory toast |
| Week progress | Visible as a 7-dot tracker; "days to payout" is shown, never owed |
| Goodie claim | Token balance checked, one claim per goodie, kind "N tokens to go" messaging if short |

Streaks track both current and longest, so a broken streak never erases history.

---

## Tech Stack & PRD/TRD Mapping

The PRD/TRD specified a Next.js + FastAPI + Gemini + Firebase architecture. This build implements the
same architecture with the sandbox-available equivalents — same roles, same data flow, same API shape:

| PRD/TRD called for | Implemented as | Why it maps |
| --- | --- | --- |
| Next.js / React frontend | **Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui** | Identical |
| FastAPI (Python) backend | **Next.js API Routes** (TypeScript) | Same REST surface; every endpoint listed in [API Reference](#api-reference) |
| Google Gemini (LLM) | **z-ai-web-dev-sdk** chat completions (`src/lib/ai.ts`) | Same prompting contract, JSON-only responses, server-side |
| Gemini Vision (proof verification) | **z-ai-web-dev-sdk** VLM (`/api/tasks/[id]/proof`) | Same image-in → structured-assessment-out role |
| Firebase Firestore | **Prisma + Neon Postgres** | Same relational domain; hosted Postgres persists across Vercel function instances |
| Firebase Storage / Cloudinary | **Base64 image column** on `Proof` with size guard | Same upload → store → display flow at demo scale |
| Firebase Auth | **httpOnly cookie session** (90-day) | Same session semantics for the demo |

Everything AI-related is isolated in server-only modules, so swapping the SDK for the Gemini API
directly is a one-file change (`src/lib/ai.ts`).

---

## Architecture

**Single-route SPA.** All views (Today / Courses / Rewards) live under one route and switch via a
Zustand store — instant view changes, no page reloads, shared wallet state across views.

```
Browser (SPA)
  │  fetch (typed client, src/lib/api.ts)
  ▼
Next.js API Routes  ──►  Prisma ──►  Neon Postgres
  │        │
  │        └────────►  z-ai-web-dev-sdk (server-only)
  │                        ├── LLM  : task micro-sequencing   (src/lib/ai.ts)
  │                        └── VLM  : photo proof verification (/api/tasks/[id]/proof)
  │
  └── cookie session (httpOnly, 90 days) — src/lib/session.ts
```

Key server-side business modules:

- `src/lib/session.ts` — cookie session, day math (`startOfDay`, `addDays`, `daysBetween`)
- `src/lib/rewards.ts` — the single source of truth for all reward math
- `src/lib/goodies.ts` — the goodie catalog and unlock tiers
- `src/lib/ai.ts` — the LLM micro-sequencer + heuristic fallbacks (server-only, never shipped to the client)
- `src/lib/sample-data.ts` — the demo seed (3 courses, 4 assignments, 8 tasks, energy history, primed wallet)

---

## Data Model

Prisma schema at `prisma/schema.prisma`:

| Model | Purpose / notable fields |
| --- | --- |
| `User` | Wallet: `coins`, `tokens`, `streakDays`, `longestStreak`, `lastActiveDay` |
| `Course` | `name`, `instructor`, pastel `color` (sage/honey/rose/lilac/peach) |
| `Assignment` | `title`, `description`, `dueDate` (stays fixed), `status` |
| `Task` | `spoonCost` (1–3), `isMicro`, `plannedDate`, `rolledCount`, `status` |
| `EnergyLog` | One per user per day (unique constraint) — the check-in |
| `Proof` | Base64 image + VLM fields (`verified`, `note`) |
| `ModeLog` | One row per mode use — powers weekly insights |
| `GoodieGrab` | One claim per goodie per user (transactional) |

---

## Database Setup

Production uses the Vercel-managed Neon database. Runtime queries use the pooled
`NEON_DATABASE_URL`; Prisma migrations use the direct `NEON_DATABASE_URL_UNPOOLED`.
Pull the Development environment before running local database commands:

```bash
vercel link --yes --scope innovation-avengers --project mind-flow
vercel env pull .env.local --environment development --yes
npm run db:generate
vercel env run --environment development -- npm run db:migrate:deploy
```

To preserve the existing local SQLite data in Neon, run the one-time import after
the schema migration:

```bash
vercel env run --environment development -- npm run db:import-sqlite
```

The import reads `db/custom.db` without modifying it and skips records already
present in Neon, so an interrupted import can be retried.

---

## API Reference

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/api/auth/login` | Upsert user; optional sample-data seed |
| GET | `/api/auth/session` | Current user + wallet |
| POST | `/api/auth/logout` | Clear session |
| GET / POST | `/api/courses` | List / create (auto-cycles pastel colors) |
| PATCH / DELETE | `/api/courses/[id]` | Edit / remove |
| GET / POST | `/api/assignments` | List / create |
| PATCH / DELETE | `/api/assignments/[id]` | Edit / remove |
| GET | `/api/tasks?filter=` | `today` \| `overdue` \| `backlog` \| `done` \| `all` |
| POST | `/api/tasks` | Single or **batch** create (used by AI breakdowns) |
| PATCH / DELETE | `/api/tasks/[id]` | Edit (reorder-safe) / remove |
| POST | `/api/tasks/[id]/complete` | Register completion → streak + weekly payout logic |
| POST | `/api/tasks/[id]/rollover` | Gentle roll to tomorrow (`rolledCount` + 1, kind message) |
| POST | `/api/tasks/[id]/proof` | Image in → VLM verify → +10 coins (always) |
| GET / POST | `/api/energy` | Today's check-in / upsert |
| POST | `/api/plan` | Spoon-capacity plan via the priority engine — reason chips included |
| GET / POST | `/api/modes` | Weekly usage counts / log a mode use |
| POST | `/api/ai/breakdown` | LLM micro-sequencing → `{microSteps, encouragement, source}` |
| GET | `/api/now` | "What should I do now?" — ≤3 deduped options + shrink offer |
| GET | `/api/ai/recommend` | "Today's gentle read" — whole-context LLM recommendation, heuristic fallback |
| GET | `/api/insights` | 14-day energy/completion series, weekly modes, study stats, gentle patterns |
| GET | `/api/rewards` | Wallet, proof gallery, goodie shelf, weekly insights |
| POST | `/api/goodies/claim` | Transactional claim with balance guard |
| GET | `/api` | Health check |

All endpoints return JSON and rely on the session cookie plus a `userId` query fallback.

---

## Design System

This is where the "don't look vibe-coded" requirement was taken seriously.

### Typography
- **Fraunces Variable** (display serif, full variable axes) — headlines, view titles, the wordmark's softer moments
  - True optical sizing (`opsz 9–144`) via the full axis build; soft terminals (SOFT 40) active
- **Instrument Sans Variable** (UI sans) — body, controls, tables; warmer than the default-grotesque look, beautiful numerals for wallet/stat contexts
- Both self-hosted via Fontsource — **zero network dependency**, no FOUT, offline-safe
- Numerals are styled with `font-variant-numeric: tabular-nums` in stat contexts (`.num` utility)

### Palette ("Soft Focus")
Defined in OKLCH in `globals.css` — warm, desaturated, never saturated-harsh:

| Token | Use |
| --- | --- |
| Cream base | App background (warm white, not pure white) |
| Sage | Primary actions, brand |
| Honey / Peach | Soft due-date labels, gentle attention |
| Rose | Soft accents (never alarm red) |
| Lilac | AI surfaces — breakdowns, suggestions, anything model-generated is visually distinct |

### Dark mode ("Evening")
A warm cocoa dark theme — deliberately **not** blue-black, which reads as cold and clinical.
Toggled in-app, persisted via `next-themes`, hydration-safe icon swap.

### Motion & feel
- Framer Motion staggered entrances on views and cards
- `prefers-reduced-motion` respected throughout
- Soft two-tier shadows (`shadow-soft`, `shadow-lift`), 1.125rem radii, hairline `fade-rule` dividers
- Custom gentle scrollbar; calm radial background washes per mode

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # All REST endpoints (see API Reference)
│   ├── globals.css             # Design tokens, both themes, custom utilities
│   ├── layout.tsx              # ThemeProvider, Toaster, metadata, fonts
│   └── page.tsx                # Single-route SPA switcher
├── components/
│   ├── app/
│   │   ├── views/               # today-view, courses-view, rewards-view, welcome-view
│   │   ├── mode-launcher.tsx    # The five adaptive modes
│   │   ├── spoon-checkin.tsx    # Daily energy check-in
│   │   ├── spoon-ui.tsx         # Spoon glyphs, SpoonDots, EnergyChip
│   │   ├── task-card.tsx        # Gentle task card + all actions
│   │   ├── suggestion-card.tsx  # Accept / edit / skip for AI suggestions
│   │   ├── breakdown-sheet.tsx  # The AI micro-step sheet
│   │   ├── proof-button.tsx     # Photo proof upload (+10 coins)
│   │   ├── wallet-chip.tsx      # Coins / tokens / streak in the header
│   │   └── ...
│   └── ui/                      # shadcn/ui primitives
├── hooks/                       # use-toast, use-mobile
└── lib/
    ├── ai.ts                    # LLM micro-sequencer + fallbacks (server-only)
    ├── rewards.ts               # All reward math
    ├── goodies.ts               # Goodie catalog
    ├── session.ts               # Cookie session + day math
    ├── sample-data.ts           # Demo seed
    ├── store.ts                 # Zustand SPA state (persisted)
    ├── api.ts                   # Typed fetch client
    ├── types.ts                 # Shared domain types
    └── db.ts                    # Prisma client
```

---

## Getting Started

### Prerequisites
- **Bun** (recommended) or Node 20+
- The `z-ai-web-dev-sdk` credentials are provisioned in the environment — no `.env` keys to fill in

### Install & run

```bash
bun install            # or: npm install
bun run db:push        # create/sync the SQLite schema  →  db/custom.db
bun run dev            # start on http://localhost:3000
```

### First login
You'll land on the welcome screen with two paths:

- **Start fresh** — your name + email; empty states everywhere, build your own semester
- **Explore with sample data** — instantly seeds 3 courses, 4 assignments, 8 tasks (including
  rolled and overdue ones), energy history, and a primed wallet, so every screen is alive immediately

### Production build

```bash
bun run build
bun start
```

---

## AI Behavior & Graceful Degradation

The system prompt in `src/lib/ai.ts` encodes the product philosophy directly:

- Steps must be **action-verb-first** and "embarrassingly small"
- ≤10 minutes each; **≤5 minutes on low energy**
- **Zero shame language** — no "just", no "simply", no "you should have"
- JSON-only responses, with robust parsing (fence stripping, brace extraction, clamping)

**Fallback chain, so a stuck student is never blocked:**

1. LLM responds → use it (`source: "ai"`)
2. LLM unreachable or unparseable → **heuristic templates per stuck-reason** (`source: "heuristic"`)
3. Proof VLM unreachable → auto-accept the proof, still award +10 coins (`verified: false`, displayed as a "trusted" badge)

Every AI surface in the UI is lilac-tinted and labeled, so it's always clear what came from the model.

---

## Accessibility & Sensory Safety

- No red anywhere in either theme — by design, not accident
- No alarms, no push notifications, no streak-loss threats
- `prefers-reduced-motion` fully respected
- Warm dark mode tested for contrast; never pure white on pure black
- Mobile layout uses safe-area insets; bottom nav is thumb-reachable
- All destructive actions ("let it go", deletions) go through AlertDialogs that explain exactly what
  is and isn't lost
- Console is kept clean; lint passes with zero warnings

---

## Screenshots

| Screen | File |
| --- | --- |
| Welcome / onboarding | `download/phase3-welcome.png` |
| Today view (desktop) | `download/phase3-today.png` |
| Courses & assignments | `download/phase4-courses.png` |
| AI micro-step breakdown | `download/phase5-breakdown.png` |
| I'm Stuck flow | `download/phase6-stuck-breakdown.png` |
| Rest mode | `download/phase6-rest.png` |
| Rewards & wallet | `download/phase7-rewards.png` |
| Goodie shelf / claim win | `download/phase7-win.png` |
| Fresh-user AI breakdown | `download/phase8-fresh-breakdown.png` |
| Dark mode ("Evening") | `download/phase8-darkmode.png` |
| Mobile 390px | `download/phase8-mobile-final2.png` |
| Reason chips on suggestions | `download/phase11-chips.png` |
| "What now?" sheet + sage glow | `download/phase12-glow.png` |
| AI gentle read card | `download/phase13-read.png` |
| Insights view (charts + patterns) | `download/phase14-insights.png` |
| Personalized dashboard chips | `download/phase15-spoonchip.png` |

---

## Scope & Trade-offs

What this build is, honestly:

- **Auth is a 90-day httpOnly cookie session**, not Firebase Auth — same semantics at demo scale,
  and swapping in a provider is isolated to `src/lib/session.ts`
- **Neon Postgres via Prisma**, not Firestore — the relational data persists across
  Vercel deployments and serverless function instances
- **Proofs are stored as base64 rows**, not object storage — right-sized for a demo; the upload
  pipeline (client compression → size guard → store → display) is already in place
- **Deployment**: the production build emits a standalone server, ready for Vercel/any Node host

Everything in the PRD's five key features, five modes, and shared planner components is implemented
and E2E-tested in a real browser — including the fresh-user path, dark mode, and 390px mobile.

## Contributing

MindFlow has a short, explicit set of ground rules — no red, no alarms, no shame language —
enforced at review time. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR; it also
contains the setup steps, the "where things go" map, and the PR checklist.

This repository ships with a GitHub Pages project page in [`docs/`](docs/). To publish it:
**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/docs`**.
No other configuration is needed.

## License

Code is released under the [MIT License](LICENSE).

If this project moves toward a commercial release, swap the MIT text for a proprietary
notice — it is a single file change, and the README section above is the only place that
references it.
