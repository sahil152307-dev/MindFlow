import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession } from "@/lib/session";
import { seedSampleData } from "@/lib/sample-data";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().slice(0, 60);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
    const withSample = Boolean(body.withSample);

    if (!name) {
      return NextResponse.json(
        { error: "A name helps us cheer for you — what should we call you?" },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "That email doesn't look quite right." },
        { status: 400 }
      );
    }

    let user = await db.user.findUnique({ where: { email } });
    let isNew = false;

    if (!user) {
      user = await db.user.create({ data: { name, email } });
      isNew = true;
    } else if (user.name !== name) {
      user = await db.user.update({ where: { id: user.id }, data: { name } });
    }

    // Seed sample data only when there's nothing to duplicate
    const hasCourses = await db.course.count({ where: { userId: user.id } });
    if (withSample && (isNew || hasCourses === 0)) {
      await seedSampleData(user.id);
      user = (await db.user.findUnique({ where: { id: user.id } }))!;
    }

    await setSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        coins: user.coins,
        tokens: user.tokens,
        streakDays: user.streakDays,
        longestStreak: user.longestStreak,
        createdAt: user.createdAt,
      },
      seeded: withSample && (isNew || hasCourses === 0),
    });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json(
      { error: "Something went soft on our side. Please try again." },
      { status: 500 }
    );
  }
}
