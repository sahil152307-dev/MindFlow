import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateRecommendation } from "@/lib/ai";

export const maxDuration = 60;

/** Today's gentle read — whole-context AI recommendation. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const recommendation = await generateRecommendation(user.id);
    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json(
      { error: "The read went soft — try again in a moment." },
      { status: 500 }
    );
  }
}
