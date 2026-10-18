import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, startOfDay } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req.nextUrl.searchParams.get("userId"));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const today = startOfDay();

  const where: Record<string, unknown> = { userId: user.id };

  if (filter === "today") {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    where.plannedDate = { gte: today, lte: end };
    where.status = { in: ["todo", "doing"] };
  } else if (filter === "overdue") {
    // anti-shame: "overdue" only means the planned day passed. No red. No alarms.
    where.plannedDate = { lt: today };
    where.status = { in: ["todo", "doing"] };
  } else if (filter === "backlog") {
    where.plannedDate = null;
    where.status = { in: ["todo", "doing"] };
  } else if (filter === "done") {
    where.status = "done";
  } else if (filter === "done-today") {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    where.status = "done";
    where.completedAt = { gte: today, lte: end };
  }
  if (req.nextUrl.searchParams.get("assignmentId")) {
    where.assignmentId = req.nextUrl.searchParams.get("assignmentId");
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      assignment: { include: { course: true } },
      proofs: { select: { id: true }, take: 1 },
    },
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      assignmentId: t.assignmentId,
      assignment: t.assignment
        ? {
            id: t.assignment.id,
            title: t.assignment.title,
            dueDate: t.assignment.dueDate,
            courseId: t.assignment.courseId,
            course: t.assignment.course
              ? { id: t.assignment.course.id, name: t.assignment.course.name, color: t.assignment.course.color }
              : null,
          }
        : null,
      title: t.title,
      notes: t.notes,
      status: t.status,
      spoonCost: t.spoonCost,
      position: t.position,
      isMicro: t.isMicro,
      plannedDate: t.plannedDate,
      completedAt: t.completedAt,
      rolledCount: t.rolledCount,
      createdAt: t.createdAt,
      hasProof: t.proofs.length > 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // —– Single task ––
  if (!Array.isArray(body.tasks)) {
    const title = String(body.title ?? "").trim().slice(0, 160);
    if (!title)
      return NextResponse.json(
        { error: "What tiny thing needs doing?" },
        { status: 400 }
      );

    const assignmentId = body.assignmentId ? String(body.assignmentId) : null;
    if (assignmentId) {
      const a = await db.assignment.findFirst({
        where: { id: assignmentId, userId: user.id },
      });
      if (!a)
        return NextResponse.json(
          { error: "Assignment not found." },
          { status: 400 }
        );
    }

    const maxPos = await db.task.count({ where: { userId: user.id } });
    const task = await db.task.create({
      data: {
        userId: user.id,
        assignmentId,
        title,
        notes: body.notes ? String(body.notes).slice(0, 400) : null,
        spoonCost: Math.min(3, Math.max(1, Number(body.spoonCost) || 1)),
        isMicro: Boolean(body.isMicro),
        plannedDate: body.plannedDate ? startOfDay(new Date(body.plannedDate)) : null,
        position: maxPos,
      },
    });
    return NextResponse.json({ task });
  }

  // —– Batch (e.g., AI micro-steps) ––
  const items = body.tasks
    .slice(0, 12)
    .map((t: { title?: string; spoonCost?: number; notes?: string; isMicro?: boolean }) => ({
      title: String(t.title ?? "").trim().slice(0, 160),
      spoonCost: Math.min(3, Math.max(1, Number(t.spoonCost) || 1)),
      notes: t.notes ? String(t.notes).slice(0, 400) : null,
      isMicro: t.isMicro !== false,
    }))
    .filter((t: { title: string }) => t.title.length > 0);

  if (items.length === 0)
    return NextResponse.json({ error: "No steps to add." }, { status: 400 });

  const assignmentId = body.assignmentId ? String(body.assignmentId) : null;
  let position = await db.task.count({ where: { userId: user.id } });

  const created = [];
  for (const item of items) {
    created.push(
      await db.task.create({
        data: {
          userId: user.id,
          assignmentId,
          plannedDate: body.plannedDate ? startOfDay(new Date(body.plannedDate)) : null,
          position: position++,
          ...item,
        },
      })
    );
  }

  return NextResponse.json({ tasks: created });
}
