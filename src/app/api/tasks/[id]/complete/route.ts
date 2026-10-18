import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { registerCompletion } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Mark a task done — zero friction, one tap. Coins come from the optional
 * proof upload; completion alone still feeds the consistency streak.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const task = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  if (task.status === "done") {
    return NextResponse.json({
      task,
      completion: {
        streakDays: user.streakDays,
        longestStreak: user.longestStreak,
        tokensAwarded: 0,
        weekProgress: user.streakDays % 7 || (user.streakDays > 0 ? 7 : 0),
        firstWinToday: false,
        message: "Already done — still counts, twice.",
      },
      alreadyDone: true,
    });
  }

  const updated = await db.task.update({
    where: { id },
    data: { status: "done", completedAt: new Date() },
  });

  const completion = await registerCompletion(user.id);
  const fresh = await db.user.findUnique({ where: { id: user.id } });

  return NextResponse.json({
    task: updated,
    completion,
    wallet: fresh
      ? { coins: fresh.coins, tokens: fresh.tokens, streakDays: fresh.streakDays, longestStreak: fresh.longestStreak }
      : null,
  });
}
