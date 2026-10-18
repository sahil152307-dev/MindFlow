import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay } from "@/lib/session";
import type { InsightsResponse } from "@/lib/types";

/**
 * Student Insights & Analytics — patterns, never grades.
 * Aggregates 14-day energy/completion history, weekly mode
 * usage, study stats and rule-based gentle patterns.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const today = startOfDay();
  const from14 = new Date(today.getTime() - 13 * 864e5);
  const from7 = new Date(today.getTime() - 6 * 864e5);

  const [fresh, energyLogs, doneTasks, proofs, modeLogs, assignments, courses, allTasks] =
    await Promise.all([
      db.user.findUnique({ where: { id: user.id } }),
      db.energyLog.findMany({
        where: { userId: user.id, date: { gte: from14 } },
        orderBy: { date: "asc" },
      }),
      db.task.findMany({
        where: { userId: user.id, status: "done", completedAt: { gte: from14 } },
        select: { completedAt: true, isMicro: true },
      }),
      db.proof.findMany({
        where: { userId: user.id },
        select: { createdAt: true },
      }),
      db.modeLog.findMany({
        where: { userId: user.id, createdAt: { gte: from7 } },
        select: { mode: true },
      }),
      db.assignment.findMany({
        where: { userId: user.id },
        select: { status: true },
      }),
      db.course.count({ where: { userId: user.id } }),
      db.task.findMany({
        where: { userId: user.id },
        select: { rolledCount: true, status: true, isMicro: true },
      }),
    ]);

  /* ——— 14-day series ——— */
  const energyByDay = new Map<string, string>();
  for (const l of energyLogs) energyByDay.set(l.date.toDateString(), l.level);

  const completionsByDay = new Map<string, number>();
  for (const t of doneTasks) {
    if (!t.completedAt) continue;
    const key = t.completedAt.toDateString();
    completionsByDay.set(key, (completionsByDay.get(key) ?? 0) + 1);
  }

  const LEVEL: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const energy: InsightsResponse["energy"] = [];
  const completions: InsightsResponse["completions"] = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(from14.getTime() + i * 864e5);
    const key = d.toDateString();
    const label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const level = energyByDay.get(key);
    energy.push({
      date: key,
      label,
      value: level ? (LEVEL[level] ?? null) : null,
    });
    completions.push({ date: key, label, count: completionsByDay.get(key) ?? 0 });
  }

  /* ——— weekly modes (PRD order) ——— */
  const MODE_LABELS: Record<string, string> = {
    plan: "Plan my day",
    stuck: "I'm stuck",
    low: "Low energy",
    motivated: "Motivated",
    rest: "Rest",
  };
  const modeCount: Record<string, number> = {};
  for (const m of modeLogs) modeCount[m.mode] = (modeCount[m.mode] ?? 0) + 1;
  const modes = (Object.keys(MODE_LABELS) as ("plan" | "stuck" | "low" | "motivated" | "rest")[]).map(
    (k) => ({ mode: MODE_LABELS[k], count: modeCount[k] ?? 0 })
  );

  /* ——— study stats ——— */
  const rolledTotal = allTasks.reduce((s, t) => s + t.rolledCount, 0);
  const letGoTotal = allTasks.filter((t) => t.status === "skipped").length;
  const microDone = allTasks.filter((t) => t.isMicro && t.status === "done").length;

  const study: InsightsResponse["study"] = {
    courses,
    assignmentsTotal: assignments.length,
    assignmentsDone: assignments.filter((a) => a.status === "done").length,
    microDone,
    rolledTotal,
    letGoTotal,
  };

  const wallet: InsightsResponse["wallet"] = {
    coins: fresh?.coins ?? 0,
    tokens: fresh?.tokens ?? 0,
    streakDays: fresh?.streakDays ?? 0,
    longestStreak: fresh?.longestStreak ?? 0,
    totalProofs: proofs.length,
  };

  /* ——— gentle patterns (rule-based, max 4) ——— */
  const patterns: string[] = [];

  const totalCompletions14 = doneTasks.length;
  const energyLogCount = energyLogs.length;

  if (energyLogCount < 3 && totalCompletions14 < 3) {
    patterns.push(
      "Not enough quiet data yet — a few more days of check-ins and patterns will surface on their own. No rush."
    );
  } else {
    // Finished things on low-energy days
    let lowWins = 0;
    for (const t of doneTasks) {
      if (!t.completedAt) continue;
      const level = energyByDay.get(t.completedAt.toDateString());
      if (level === "low") lowWins++;
    }
    if (lowWins > 0) {
      patterns.push(
        `You finished ${lowWins} thing${lowWins === 1 ? "" : "s"} even on low-energy days — that's real resilience, not luck.`
      );
    }

    // Fuller days carry a bit more?
    const avgFor = (lvl: string) => {
      const counts = energy
        .filter((e) => e.value === LEVEL[lvl])
        .map((e) => completionsByDay.get(e.date) ?? 0);
      return counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    };
    const highAvg = avgFor("high");
    const medAvg = avgFor("medium");
    if (highAvg > medAvg + 0.5) {
      patterns.push(
        "Your fuller days carry a bit more — that's a pattern, not a rule to live by."
      );
    }

    // Most-reached-for mode this week
    const topMode = [...modes].sort((a, b) => b.count - a.count)[0];
    if (topMode && topMode.count >= 2) {
      patterns.push(
        `You reach for "${topMode.mode}" most (${topMode.count}× this week). Using your tools is the work.`
      );
    }

    if ((fresh?.streakDays ?? 0) >= 3) {
      patterns.push(
        `${fresh?.streakDays} days of showing up. Consistency looks quiet on you.`
      );
    }

    if (proofs.length >= 3) {
      patterns.push(
        `You've shown your win ${proofs.length} times — the camera believes in you.`
      );
    }

    if (rolledTotal >= 5) {
      patterns.push(
        "Some things take their time here — that's information about the tasks, not about you."
      );
    }

    // Data exists but no specific rule fired — still say something kind
    if (patterns.length === 0) {
      patterns.push(
        "Your check-ins and finished things are quietly building a picture — more days, more patterns. No rush."
      );
    }
  }

  const payload: InsightsResponse = {
    wallet,
    energy,
    completions,
    modes,
    study,
    patterns: patterns.slice(0, 4),
  };

  return NextResponse.json(payload);
}
