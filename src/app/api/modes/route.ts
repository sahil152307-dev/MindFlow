import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Log a mode visit — powers gentle "you used X this week" insights. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mode = ["plan", "stuck", "low", "motivated", "rest"].includes(body.mode)
    ? body.mode
    : null;

  if (!mode) {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

  const log = await db.modeLog.create({
    data: { userId: user.id, mode },
  });

  return NextResponse.json({ log });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req.nextUrl.searchParams.get("userId"));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const logs = await db.modeLog.findMany({
    where: { userId: user.id, createdAt: { gte: weekAgo } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const counts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.mode] = (acc[l.mode] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ counts, recent: logs.slice(0, 8) });
}
