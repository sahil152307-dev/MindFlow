import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay, daysBetween } from "@/lib/session";
import type { DayPlan, PlanSuggestion } from "@/lib/types";

/* Spoon capacity per energy level — deliberately gentle. */
const CAPACITY: Record<string, number> = { low: 2, medium: 4, high: 7 };
const MAX_TASKS: Record<string, number> = { low: 2, medium: 3, high: 5 };

const LOW_SUMMARIES = [
  "A low-spoon day — here's the lightest possible way forward.",
  "Today is a two-spoon day. Two tiny things will be plenty.",
];
const MED_SUMMARIES = [
  "A medium day — a small mix that fits your energy.",
  "Steady energy today. Here's a balanced, doable slice.",
];
const HIGH_SUMMARIES = [
  "You're riding high — here's a fuller plate you can pick from.",
  "Great energy today! A slightly bigger bite, still no pressure.",
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const level = ["low", "medium", "high"].includes(body.energy)
    ? body.energy
    : null;

  if (!level) {
    return NextResponse.json(
      { error: "Check in with your energy first — how are today's spoons?" },
      { status: 400 }
    );
  }

  const today = startOfDay();

  // Candidates: anything open that isn't already planned for another future day
  const candidates = await db.task.findMany({
    where: {
      userId: user.id,
      status: { in: ["todo", "doing"] },
      OR: [{ plannedDate: null }, { plannedDate: { lte: today } }],
    },
    include: { assignment: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  if (candidates.length === 0) {
    const plan: DayPlan = {
      suggestions: [],
      summary:
        "Nothing waiting in your basket. Add an assignment, or simply enjoy the clear sky. 🌤️",
      capacity: CAPACITY[level],
    };
    return NextResponse.json({ plan });
  }

  // Score: due-date urgency first, micro-steps are easier starts,
  // fewer spoons preferred on low days.
  const scored = candidates.map((t) => {
    let score = 0;
    if (t.assignment) {
      const daysLeft = daysBetween(today, t.assignment.dueDate);
      score += Math.max(0, 40 - daysLeft * 4); // closer due date → higher
      if (daysLeft < 0) score += 12; // past due gets gentle priority
    }
    if (t.isMicro) score += 8;
    if (level === "low") score += (4 - t.spoonCost) * 6;
    if (level === "high") score += t.spoonCost * 2;
    if (t.rolledCount > 0) score -= 4; // don't nag rolled tasks
    return { task: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Fill the day within capacity, keeping the list short and kind.
  const capacity = CAPACITY[level];
  const maxTasks = MAX_TASKS[level];
  let used = 0;
  const picked: typeof scored = [];

  for (const s of scored) {
    if (picked.length >= maxTasks) break;
    if (used + s.task.spoonCost > capacity) {
      // On low days, a single 2-spoon task alone is still OK
      if (!(level === "low" && picked.length === 0 && s.task.spoonCost <= 2)) {
        continue;
      }
    }
    picked.push(s);
    used += s.task.spoonCost;
  }

  // Fallback: if nothing fit (e.g., only 3-spoon tasks on a low day),
  // suggest the smallest / highest-scored one anyway — something beats nothing.
  if (picked.length === 0) {
    picked.push(scored[0]);
    used = scored[0].task.spoonCost;
  }

  const suggestions: PlanSuggestion[] = picked.map((s) => ({
    task: {
      id: s.task.id,
      assignmentId: s.task.assignmentId,
      assignment: s.task.assignment
        ? {
            id: s.task.assignment.id,
            title: s.task.assignment.title,
            dueDate: s.task.assignment.dueDate,
            course: null,
            courseId: s.task.assignment.courseId,
          }
        : null,
      title: s.task.title,
      notes: s.task.notes,
      status: s.task.status,
      spoonCost: s.task.spoonCost,
      position: s.task.position,
      isMicro: s.task.isMicro,
      plannedDate: s.task.plannedDate,
      completedAt: s.task.completedAt,
      rolledCount: s.task.rolledCount,
      createdAt: s.task.createdAt,
      hasProof: false,
    },
    reason: reasonFor(s.task, today),
  }));

  const summaries =
    level === "low" ? LOW_SUMMARIES : level === "medium" ? MED_SUMMARIES : HIGH_SUMMARIES;

  const plan: DayPlan = {
    suggestions,
    summary: `${summaries[Math.floor(Math.random() * summaries.length)]} About ${used} spoon${used === 1 ? "" : "s"} of work.`,
    capacity,
  };

  return NextResponse.json({ plan });
}

function reasonFor(
  t: { assignmentId: string | null; isMicro: boolean; spoonCost: number; rolledCount: number },
  today: Date
): string {
  if (t.spoonCost === 1)
    return "Tiny and quick — a gentle win.";
  if (t.isMicro) return "A micro-step that's already broken down for you.";
  if (t.rolledCount > 0) return "It's been patient with you. It can wait a little more if needed.";
  return "Fits today's energy.";
}
