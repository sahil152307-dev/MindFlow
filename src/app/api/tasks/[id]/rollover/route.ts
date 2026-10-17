import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, getCurrentUser, startOfDay } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The Anti-Shame "Gentle Rollover" engine.
 * No red badges, no alarms — a task can always roll forward kindly,
 * and every roll is tracked with warmth, never guilt.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const task = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const today = startOfDay();
  const target =
    body.to === "next-week"
      ? addDays(today, 7)
      : body.to === "weekend"
        ? addDays(today, 6 - today.getDay() || 7)
        : addDays(today, 1);

  const updated = await db.task.update({
    where: { id },
    data: { plannedDate: target, rolledCount: task.rolledCount + 1 },
  });

  const rolledTwice = updated.rolledCount >= 3;

  return NextResponse.json({
    task: updated,
    message: rolledTwice
      ? "This one keeps sliding — want to break it into smaller steps next time you look at it? No pressure today."
      : "Rolled forward with zero guilt. Tomorrow-you will meet it fresh.",
  });
}
