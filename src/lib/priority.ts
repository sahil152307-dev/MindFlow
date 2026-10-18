/* ————————————————————————————————
   MindFlow · Smart Priority engine
   Scores open tasks for auto-planning and
   produces gentle, human-readable "why"
   chips. Kindness is a weight, not an
   afterthought: heavily-rolled tasks are
   de-prioritised (nagging is unkind) and
   pointed toward "shrink it" instead.
———————————————————————————————— */

import { daysBetween } from "@/lib/session";
import { CAPACITY, MAX_TASKS } from "@/lib/types";

// Re-export so existing server consumers keep their import paths.
export { CAPACITY, MAX_TASKS };

export type ReasonTone = "sage" | "honey" | "lilac" | "peach";

export interface ReasonChip {
  text: string;
  tone: ReasonTone;
}

export type EnergyLevel = "low" | "medium" | "high";

export interface PriorityCandidate {
  id: string;
  title: string;
  spoonCost: number;
  isMicro: boolean;
  rolledCount: number;
  status: string;
  plannedDate: Date | null;
  position: number;
  assignment: { dueDate: Date; title: string } | null;
}

export interface ScoredCandidate {
  candidate: PriorityCandidate;
  score: number;
  reasons: ReasonChip[];
}

interface Factor {
  weight: number;
  chip: ReasonChip | null;
}

/**
 * Due-date closeness. Overdue is capped — a passed
 * due date deserves a look, never a siren.
 */
function dueFactor(c: PriorityCandidate, today: Date): Factor {
  if (!c.assignment) return { weight: 0, chip: null };
  const daysLeft = daysBetween(today, c.assignment.dueDate);

  if (daysLeft < 0) {
    return {
      weight: 34,
      chip: {
        text: "Due date passed — it gets a gentle first look",
        tone: "honey",
      },
    };
  }
  if (daysLeft <= 2) {
    return {
      weight: 30 - daysLeft * 3,
      chip: {
        text:
          daysLeft === 0
            ? "Due today, if you're up for it"
            : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        tone: "honey",
      },
    };
  }
  if (daysLeft <= 7) {
    return {
      weight: 18 - (daysLeft - 3) * 2,
      chip: { text: `Due in ${daysLeft} days`, tone: "peach" },
    };
  }
  if (daysLeft <= 21) {
    return { weight: 6, chip: null };
  }
  return { weight: 0, chip: null };
}

/**
 * How kindly the task sits on today's energy.
 * On low days the smallest steps shine; on high
 * days a little more substance earns its place.
 */
function energyFactor(c: PriorityCandidate, energy: EnergyLevel): Factor {
  if (energy === "low") {
    if (c.spoonCost === 1)
      return {
        weight: 22,
        chip: { text: "Gentle on a low-energy day", tone: "sage" },
      };
    if (c.spoonCost === 2) return { weight: 8, chip: null };
    return { weight: 0, chip: null };
  }
  if (energy === "medium") {
    if (c.spoonCost === 2)
      return {
        weight: 12,
        chip: { text: "Comfortable at medium energy", tone: "sage" },
      };
    if (c.spoonCost === 1) return { weight: 10, chip: null };
    return { weight: 4, chip: null };
  }
  // high
  if (c.spoonCost === 3)
    return {
      weight: 12,
      chip: { text: "A fuller day can carry this", tone: "sage" },
    };
  if (c.spoonCost === 2) return { weight: 10, chip: null };
  return { weight: 6, chip: null };
}

function microFactor(c: PriorityCandidate): Factor {
  if (!c.isMicro) return { weight: 0, chip: null };
  return {
    weight: 12,
    chip: { text: "A five-minute kind of step", tone: "lilac" },
  };
}

/**
 * The anti-shame weight. Tasks that have rolled
 * several times are clearly hard — pushing them
 * up the list would be nagging. They drift down
 * instead, and the chip quietly offers the kind
 * alternative: shrink it.
 */
function rollFactor(c: PriorityCandidate): Factor {
  if (c.rolledCount >= 3) {
    return {
      weight: -18,
      chip: {
        text: `Rolled ${c.rolledCount}× — shrinking it might help`,
        tone: "peach",
      },
    };
  }
  if (c.rolledCount > 0) {
    return {
      weight: -6,
      chip: { text: "Been patient — no rush", tone: "sage" },
    };
  }
  return { weight: 0, chip: null };
}

/**
 * Score one candidate. Reason chips are the top
 * contributing factors (max 2), most significant
 * first. There is always at least one chip.
 */
export function scoreCandidate(
  c: PriorityCandidate,
  energy: EnergyLevel,
  today: Date
): ScoredCandidate {
  const factors = [
    dueFactor(c, today),
    energyFactor(c, energy),
    microFactor(c),
    rollFactor(c),
  ];

  let score = factors.reduce((sum, f) => sum + f.weight, 0);

  // Tiny tie-breaker so the user's own ordering still matters
  score += Math.max(0, 10 - c.position) * 0.5;
  // Tasks already placed on today get a small nudge upward
  if (c.plannedDate && daysBetween(today, c.plannedDate) <= 0) score += 4;

  const contributors = factors
    .filter((f) => f.chip && f.weight >= 6)
    .sort((a, b) => b.weight - a.weight)
    .map((f) => f.chip as ReasonChip);

  const reasons: ReasonChip[] =
    contributors.length > 0
      ? contributors.slice(0, 2)
      : [{ text: "Fits today's energy", tone: "sage" }];

  return { candidate: c, score: Math.round(score * 10) / 10, reasons };
}

/**
 * Build a full plan: score everything, sort, and
 * fill the day within spoon capacity. Never
 * returns an empty list if there is anything open.
 */
export function buildPlan<T extends PriorityCandidate>(
  candidates: T[],
  energy: EnergyLevel,
  today: Date
): { picked: ScoredCandidate[]; usedSpoons: number; capacity: number } {
  const capacity = CAPACITY[energy];
  const maxTasks = MAX_TASKS[energy];

  const scored = candidates
    .map((c) => scoreCandidate(c, energy, today))
    .sort((a, b) => b.score - a.score);

  let used = 0;
  const picked: ScoredCandidate[] = [];

  for (const s of scored) {
    if (picked.length >= maxTasks) break;
    if (used + s.candidate.spoonCost > capacity) {
      // On low days a single 2-spoon task alone is still OK
      if (
        !(
          energy === "low" &&
          picked.length === 0 &&
          s.candidate.spoonCost <= 2
        )
      ) {
        continue;
      }
    }
    picked.push(s);
    used += s.candidate.spoonCost;
  }

  // If nothing fit (only 3-spoon tasks on a low day), offer the
  // highest-scored one anyway — something beats nothing.
  if (picked.length === 0 && scored.length > 0) {
    picked.push(scored[0]);
    used = scored[0].candidate.spoonCost;
  }

  return { picked, usedSpoons: used, capacity };
}
