import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay } from "@/lib/session";
import type { DayPlan, PlanSuggestion } from "@/lib/types";
import { buildPlan, CAPACITY, type PriorityCandidate } from "@/lib/priority";

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
  const rows = await db.task.findMany({
    where: {
      userId: user.id,
      status: { in: ["todo", "doing"] },
      OR: [{ plannedDate: null }, { plannedDate: { lte: today } }],
    },
    include: { assignment: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  if (rows.length === 0) {
    const plan: DayPlan = {
      suggestions: [],
      summary:
        "Nothing waiting in your basket. Add an assignment, or simply enjoy the clear sky. 🌤️",
      capacity: CAPACITY[level],
    };
    return NextResponse.json({ plan });
  }

  const candidates: PriorityCandidate[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    spoonCost: t.spoonCost,
    isMicro: t.isMicro,
    rolledCount: t.rolledCount,
    status: t.status,
    plannedDate: t.plannedDate,
    position: t.position,
    assignment: t.assignment
      ? { dueDate: t.assignment.dueDate, title: t.assignment.title }
      : null,
  }));

  const { picked, usedSpoons, capacity } = buildPlan(
    candidates,
    level,
    today
  );

  const byId = new Map(rows.map((t) => [t.id, t]));

  const suggestions: PlanSuggestion[] = picked.map((s) => {
    const t = byId.get(s.candidate.id)!;
    return {
      task: {
        id: t.id,
        assignmentId: t.assignmentId,
        assignment: t.assignment
          ? {
              id: t.assignment.id,
              title: t.assignment.title,
              dueDate: t.assignment.dueDate,
              course: null,
              courseId: t.assignment.courseId,
            }
          : null,
        title: t.title,
        notes: t.notes,
        status: t.status,
        spoonCost: t.spoonCost,
        position: t.position,
        isMicro: t.isMicro,
        plannedDate: t.plannedDate,
        completedAt: t.completedAt,
        rolledCount: t.rolledCount,
        createdAt: t.createdAt,
        hasProof: false,
      },
      reason: s.reasons[0]?.text ?? "Fits today's energy",
      reasons: s.reasons,
    };
  });

  const summaries =
    level === "low"
      ? LOW_SUMMARIES
      : level === "medium"
        ? MED_SUMMARIES
        : HIGH_SUMMARIES;

  const plan: DayPlan = {
    suggestions,
    summary: `${summaries[Math.floor(Math.random() * summaries.length)]} About ${usedSpoons} spoon${usedSpoons === 1 ? "" : "s"} of work.`,
    capacity,
  };

  return NextResponse.json({ plan });
}
