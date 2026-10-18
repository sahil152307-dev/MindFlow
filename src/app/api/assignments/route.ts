import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req.nextUrl.searchParams.get("userId"));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const assignments = await db.assignment.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
    include: {
      course: true,
      _count: { select: { tasks: true } },
    },
  });

  // done-task counts need a second pass (filtered count)
  const withCounts = await Promise.all(
    assignments.map(async (a) => ({
      id: a.id,
      courseId: a.courseId,
      course: a.course
        ? {
            id: a.course.id,
            name: a.course.name,
            color: a.course.color,
            instructor: a.course.instructor,
            createdAt: a.course.createdAt,
          }
        : null,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      status: a.status as "active" | "done",
      createdAt: a.createdAt,
      taskCount: a._count.tasks,
      doneTaskCount: await db.task.count({
        where: { assignmentId: a.id, status: "done" },
      }),
    }))
  );

  return NextResponse.json({ assignments: withCounts });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim().slice(0, 140);
  const description = String(body.description ?? "").trim().slice(0, 800) || null;
  const courseId = body.courseId ? String(body.courseId) : null;
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;

  if (!title) {
    return NextResponse.json(
      { error: "What's the assignment called?" },
      { status: 400 }
    );
  }
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return NextResponse.json(
      { error: "A due date helps us plan around it." },
      { status: 400 }
    );
  }
  if (courseId) {
    const course = await db.course.findFirst({
      where: { id: courseId, userId: user.id },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 400 });
    }
  }

  const assignment = await db.assignment.create({
    data: { userId: user.id, title, description, courseId, dueDate },
  });

  // Optional starter tasks (e.g., first micro-steps suggested at creation)
  const starterTasks: { title: string; spoonCost: number; isMicro?: boolean; notes?: string }[] =
    Array.isArray(body.starterTasks) ? body.starterTasks.slice(0, 12) : [];

  let position = 0;
  for (const t of starterTasks) {
    const tTitle = String(t.title ?? "").trim().slice(0, 160);
    if (!tTitle) continue;
    await db.task.create({
      data: {
        userId: user.id,
        assignmentId: assignment.id,
        title: tTitle,
        notes: t.notes ? String(t.notes).slice(0, 400) : null,
        spoonCost: Math.min(3, Math.max(1, Number(t.spoonCost) || 1)),
        isMicro: Boolean(t.isMicro),
        position: position++,
      },
    });
  }

  return NextResponse.json({ assignment });
}
