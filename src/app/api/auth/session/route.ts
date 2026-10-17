import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const fallback = req.nextUrl.searchParams.get("userId");
  const user = await getCurrentUser(fallback);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
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
  });
}
