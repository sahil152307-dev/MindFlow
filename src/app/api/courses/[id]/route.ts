import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { COURSE_COLORS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; instructor?: string | null; color?: string } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);
    if (!name)
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    data.name = name;
  }
  if (body.instructor !== undefined) {
    data.instructor = String(body.instructor).trim().slice(0, 80) || null;
  }
  if (body.color !== undefined && COURSE_COLORS.includes(body.color)) {
    data.color = body.color;
  }

  const course = await db.course.updateMany({
    where: { id, userId: user.id },
  }).then(async (r) => {
    if (r.count === 0) return null;
    return db.course.update({ where: { id }, data });
  });

  if (!course)
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  return NextResponse.json({ course });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // assignments keep floating (SetNull); tasks tied to those assignments cascade
  const r = await db.course.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0)
    return NextResponse.json({ error: "Course not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
