import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { GOODIES_CATALOG } from "@/lib/goodies";

/**
 * Claim a goodie from the shelf. Tokens are deducted only when the balance
 * genuinely covers it — no debt, no guilt.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const goodie = GOODIES_CATALOG.find((g) => g.key === body.key);
  if (!goodie) return NextResponse.json({ error: "That goodie doesn't exist." }, { status: 404 });

  const already = await db.goodieGrab.findFirst({
    where: { userId: user.id, goodieKey: goodie.key },
  });
  if (already) {
    return NextResponse.json(
      { error: "Already yours — one per kind soul. 🌿" },
      { status: 409 }
    );
  }

  if (user.tokens < goodie.cost) {
    const missing = goodie.cost - user.tokens;
    return NextResponse.json(
      {
        error: `${missing} token${missing === 1 ? "" : "s"} to go — keep the gentle streak alive and it'll get here.`,
      },
      { status: 400 }
    );
  }

  const [grab, fresh] = await db.$transaction([
    db.goodieGrab.create({
      data: { userId: user.id, goodieKey: goodie.key, cost: goodie.cost },
    }),
    db.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: goodie.cost } },
    }),
  ]);

  return NextResponse.json({
    goodie: { ...goodie, claimed: true },
    wallet: { tokens: fresh.tokens },
    message: `The ${goodie.name} is yours! Well earned, gently. 🎁`,
  });
}
