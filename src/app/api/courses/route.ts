import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { COURSE_COLORS, type CourseColor } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req.nextUrl.searchParams.get("userId"));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const courses = await db.course.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color as CourseColor,
      instructor: c.instructor,
      createdAt: c.createdAt,
      assignmentCount: c._count.assignments,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const instructor = String(body.instructor ?? "").trim().slice(0, 80) || null;
  const color = COURSE_COLORS.includes(body.color) ? body.color : "sage";

  if (!name) {
    return NextResponse.json(
      { error: "Give your course a name first." },
      { status: 400 }
    );
  }

  const course = await db.course.create({
    data: { userId: user.id, name, color, instructor },
  });

  return NextResponse.json({ course });
}
