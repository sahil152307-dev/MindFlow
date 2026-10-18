import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    description?: string | null;
    dueDate?: Date;
    status?: string;
    courseId?: string | null;
  } = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 140);
    if (!title)
      return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
    data.title = title;
  }
  if (body.description !== undefined) {
    data.description = String(body.description).trim().slice(0, 800) || null;
  }
  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (Number.isNaN(d.getTime()))
      return NextResponse.json({ error: "Bad date." }, { status: 400 });
    data.dueDate = d;
  }
  if (body.status !== undefined && ["active", "done"].includes(body.status)) {
    data.status = body.status;
  }
  if (body.courseId !== undefined) {
    data.courseId = body.courseId ? String(body.courseId) : null;
  }

  const owned = await db.assignment.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned)
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const assignment = await db.assignment.update({ where: { id }, data });
  return NextResponse.json({ assignment });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const r = await db.assignment.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0)
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
