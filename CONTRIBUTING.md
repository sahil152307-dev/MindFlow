# Contributing to MindFlow

Thanks for wanting to help build a kinder planner. This file is short on purpose —
the app stands against unnecessary pressure, and so does its contribution process.

## Ground rules — read these first

MindFlow makes an explicit contract with its users, and every change is reviewed against it:

1. **No red, anywhere.** No red text, badges, borders, or error-tinted states. Due labels use
   the honey/peach tokens. Failure states stay neutral, never alarming.
2. **No alarms.** No notifications, no due-date sirens, no streak-loss warnings. Students come
   to the app; the app never ambushes them.
3. **Shame language is a bug.** No "just", "simply", or "you should have" in UI copy — and no
   guilt framing anywhere else, either.
4. **Energy is information.** Low energy changes the plan, never the tone. Copy stays neutral
   in every state.
5. **AI surfaces are lilac.** Anything model-generated (breakdowns, suggestions, VLM notes)
   uses the lilac tokens so it is always visually distinct from product UI.
6. **Tokens only, both themes.** Never hardcode colors. Use the design tokens in
   `src/app/globals.css`; every change must pass in "Soft Focus" (light) and "Evening" (dark).
7. **Reduced motion by default.** Any new animation must respect `prefers-reduced-motion`.

Breaking a ground rule blocks a merge, even if the code is otherwise correct.

## Setup

```bash
bun install
bun run db:push        # creates/syncs db/custom.db
bun run dev            # http://localhost:3000
```

On the welcome screen, **Explore with sample data** seeds a full demo semester in one click —
3 courses, 4 assignments, 8 tasks, energy history, and a primed wallet.

## Where things go

| You are adding… | It goes in… |
| --- | --- |
| A REST endpoint | `src/app/api/**/route.ts` |
| Business math (rewards, streaks, tokens) | `src/lib/rewards.ts` — keep it the single source of truth |
| AI prompting or fallbacks | `src/lib/ai.ts` (server-only — never import it from client code) |
| A view | `src/components/app/views/` |
| A shared component | `src/components/app/` |
| Design tokens | `src/app/globals.css` (both themes) |
| Domain types | `src/lib/types.ts` (mirror the Prisma schema) |

## Conventions

- TypeScript strict; no `any` in new code.
- Function components with hooks; state that must survive view switches goes in the Zustand
  store, not component state.
- AI and VLM calls stay server-side; the client only ever sees typed JSON.
- No new dependencies without a stated reason in the PR.
- All date handling goes through the helpers in `src/lib/session.ts` (`startOfDay`, `addDays`,
  `daysBetween`). Timezone bugs live here — never roll your own date math.
- Write date normalization on the way in (`startOfDay`), and use range filters on the way out
  (`gte`/`lte` end-of-day), never exact `DateTime` equality.

## Before you open a PR

- [ ] `bun run lint` passes
- [ ] Both themes pass — "Soft Focus" light and "Evening" dark
- [ ] Checked at 390px and 1440px
- [ ] Console is clean — no errors, no warnings
- [ ] The ground rules were re-read, honestly

Pull requests get a kind review. Code review here is held to the same standard as the
product: specific, generous, and free of shame language.
