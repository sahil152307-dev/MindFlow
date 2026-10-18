import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    notes?: string | null;
    status?: string;
    spoonCost?: number;
    position?: number;
    plannedDate?: Date | null;
  } = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 160);
    if (!title)
      return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
    data.title = title;
  }
  if (body.notes !== undefined) {
    data.notes = String(body.notes).trim().slice(0, 400) || null;
  }
  if (body.status !== undefined && ["todo", "doing", "done", "skipped"].includes(body.status)) {
    data.status = body.status;
  }
  if (body.spoonCost !== undefined) {
    data.spoonCost = Math.min(3, Math.max(1, Number(body.spoonCost) || 1));
  }
  if (body.position !== undefined) {
    data.position = Number(body.position) || 0;
  }
  if (body.plannedDate !== undefined) {
    data.plannedDate = body.plannedDate ? startOfDay(new Date(body.plannedDate)) : null;
  }

  const owned = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const task = await db.task.update({ where: { id }, data });
  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const r = await db.task.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
