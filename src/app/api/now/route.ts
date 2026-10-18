import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay, daysBetween } from "@/lib/session";
import { scoreCandidate, type PriorityCandidate, type ReasonChip } from "@/lib/priority";

/**
 * "What should I do now?" — the decision-paralysis valve.
 * Returns a short, kind list of at most 3 focus options,
 * computed from the real priority engine plus time of day.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const today = startOfDay();
  const hour = new Date().getHours();
  const timeOfDay: "morning" | "afternoon" | "evening" | "night" =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 18
        ? "afternoon"
        : hour >= 18 && hour < 23
          ? "evening"
          : "night";

  const [energyLog, tasks, doneToday] = await Promise.all([
    db.energyLog.findFirst({
      where: { userId: user.id, date: today },
    }),
    db.task.findMany({
      where: {
        userId: user.id,
        status: { in: ["todo", "doing"] },
        OR: [{ plannedDate: null }, { plannedDate: { lte: today } }],
      },
      include: { assignment: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    db.task.count({
      where: {
        userId: user.id,
        status: "done",
        completedAt: { gte: today },
      },
    }),
  ]);

  const energy = (energyLog?.level as "low" | "medium" | "high" | null) ?? null;

  if (tasks.length === 0) {
    return NextResponse.json({
      context: { timeOfDay, energy, openCount: 0, doneToday },
      options: [],
      breakdownTarget: null,
    });
  }

  const candidates: PriorityCandidate[] = tasks.map((t) => ({
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

  const scored = candidates
    .map((c) => scoreCandidate(c, energy ?? "medium", today))
    .sort((a, b) => b.score - a.score);

  const byId = new Map(
    tasks.map((t) => [
      t.id,
      {
        id: t.id,
        title: t.title,
        spoonCost: t.spoonCost,
        isMicro: t.isMicro,
        rolledCount: t.rolledCount,
        assignmentId: t.assignmentId,
        planned: t.plannedDate
          ? daysBetween(today, t.plannedDate) === 0
            ? "today"
            : "overdue"
          : "unplanned",
        onToday: !!t.plannedDate && daysBetween(today, t.plannedDate) <= 0,
        dueInDays: t.assignment ? daysBetween(today, t.assignment.dueDate) : null,
        assignmentTitle: t.assignment?.title ?? null,
      },
    ])
  );

  const summary = (id: string) => byId.get(id)!;

  /* 1 — the lightest thing on the plate */
  const gentlest = [...scored].sort(
    (a, b) =>
      a.candidate.spoonCost - b.candidate.spoonCost ||
      (a.candidate.assignment?.dueDate
        ? a.candidate.assignment.dueDate.getTime()
        : Infinity) -
        (b.candidate.assignment?.dueDate
          ? b.candidate.assignment.dueDate.getTime()
          : Infinity) ||
      b.score - a.score
  )[0];

  /* 2 — the most useful right now (engine's top) */
  const useful = scored[0];

  /* 3 — a five-minute win: prefer an existing micro/1-spoon task */
  const fivemin = [...scored].sort(
    (a, b) =>
      Number(b.candidate.isMicro) - Number(a.candidate.isMicro) ||
      a.candidate.spoonCost - b.candidate.spoonCost ||
      b.score - a.score
  )[0];
  const hasQuickWin = fivemin.candidate.isMicro || fivemin.candidate.spoonCost === 1;

  /* Dedupe by task id — never show the same thing twice */
  const seen = new Set<string>();
  const options: NowOption[] = [];

  const push = (
    kind: NowOption["kind"],
    scoredRef: typeof gentlest,
    reasons: ReasonChip[]
  ) => {
    if (seen.has(scoredRef.candidate.id)) return;
    seen.add(scoredRef.candidate.id);
    options.push({
      kind,
      task: summary(scoredRef.candidate.id),
      reasons,
    });
  };

  push("gentlest", gentlest, [
    { text: "The lightest thing on your plate", tone: "sage" },
    ...gentlest.reasons.slice(0, 1),
  ]);
  push("useful", useful, [
    { text: "Helps most right now", tone: "honey" },
    ...useful.reasons.slice(0, 1),
  ]);

  if (hasQuickWin) {
    push("fivemin", fivemin, [
      { text: "A five-minute kind of step", tone: "lilac" },
      ...fivemin.reasons.slice(0, 1),
    ]);
  }

  /* If nothing quick exists, offer shrinking the most useful one */
  let breakdownTarget: ReturnType<typeof summary> | null = null;
  if (!hasQuickWin || options.length < 2) {
    breakdownTarget = summary(useful.candidate.id);
  }

  return NextResponse.json({
    context: { timeOfDay, energy, openCount: tasks.length, doneToday },
    options,
    breakdownTarget,
  });
}

export interface NowOption {
  kind: "gentlest" | "useful" | "fivemin";
  task: {
    id: string;
    title: string;
    spoonCost: number;
    isMicro: boolean;
    rolledCount: number;
    assignmentId: string | null;
    planned: "today" | "overdue" | "unplanned";
    onToday: boolean;
    dueInDays: number | null;
    assignmentTitle: string | null;
  };
  reasons: ReasonChip[];
}
