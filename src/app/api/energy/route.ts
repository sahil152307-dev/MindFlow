import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, getCurrentUser, startOfDay } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req.nextUrl.searchParams.get("userId"));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const today = startOfDay();
  const weekAgo = addDays(today, -7);

  const logs = await db.energyLog.findMany({
    where: { userId: user.id, date: { gte: weekAgo } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    today: logs.find((l) => l.date.getTime() === today.getTime()) ?? null,
    recent: logs,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const level = ["low", "medium", "high"].includes(body.level)
    ? body.level
    : null;
  const note = body.note ? String(body.note).trim().slice(0, 200) : null;

  if (!level) {
    return NextResponse.json(
      { error: "Pick how today feels — low, medium or high." },
      { status: 400 }
    );
  }

  const today = startOfDay();
  const log = await db.energyLog.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { level, note },
    create: { userId: user.id, date: today, level, note },
  });

  return NextResponse.json({ log });
}
