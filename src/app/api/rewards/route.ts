import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay } from "@/lib/session";
import { weekProgressOf, daysToPayout, GOODIE_UNLOCK } from "@/lib/rewards";
import { GOODIES_CATALOG } from "@/lib/goodies";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req.nextUrl.searchParams.get("userId"));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [proofs, grabs, modeLogs, todayWin] = await Promise.all([
    db.proof.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 9,
      include: { task: { select: { title: true } } },
    }),
    db.goodieGrab.findMany({ where: { userId: user.id } }),
    db.modeLog.findMany({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
    db.task.count({
      where: {
        userId: user.id,
        status: "done",
        completedAt: { gte: startOfDay() },
      },
    }),
  ]);

  const modeCounts = modeLogs.reduce<Record<string, number>>((acc, l) => {
    acc[l.mode] = (acc[l.mode] ?? 0) + 1;
    return acc;
  }, {});

  const claimedKeys = new Set(grabs.map((g) => g.goodieKey));

  return NextResponse.json({
    wallet: {
      coins: user.coins,
      tokens: user.tokens,
      streakDays: user.streakDays,
      longestStreak: user.longestStreak,
      weekProgress: weekProgressOf(user.streakDays),
      daysToPayout: daysToPayout(user.streakDays),
      goodieUnlockAt: GOODIE_UNLOCK,
      consistentToday: todayWin > 0,
      totalProofs: await db.proof.count({ where: { userId: user.id } }),
      proofs: proofs.map((p) => ({
        id: p.id,
        taskId: p.taskId,
        taskTitle: p.task.title,
        image: p.image,
        verified: p.verified,
        aiNote: p.aiNote,
        coinsAwarded: p.coinsAwarded,
        createdAt: p.createdAt,
      })),
      goodies: GOODIES_CATALOG.map((g) => ({
        ...g,
        claimed: claimedKeys.has(g.key),
        unlocked: user.tokens >= g.cost,
      })),
      modeCounts,
    },
  });
}
