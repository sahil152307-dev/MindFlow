import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PROOF_COINS } from "@/lib/rewards";

/**
 * The Visual Proof dopamine loop. The student uploads a photo of their work;
 * a vision model takes a kind look at it. Coins are awarded either way —
 * verification adds delight, never punishment (anti-shame by design).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const image = String(body.image ?? "");

  if (!image.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "That doesn't look like an image we can open." },
      { status: 400 }
    );
  }
  if (image.length > 2_500_000) {
    return NextResponse.json(
      { error: "That photo is a little heavy — try a smaller one." },
      { status: 413 }
    );
  }

  const task = await db.task.findFirst({ where: { id: taskId, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const taskTitle = task.title;

  const already = await db.proof.findFirst({ where: { taskId } });
  if (already) {
    return NextResponse.json(
      { error: "This task already earned its coins. Once is plenty! 🌿" },
      { status: 409 }
    );
  }

  // ——— gentle vision verification ———
  let verified = true;
  let note = "Auto-accepted — our checker is napping, but your effort counts.";
  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are MindFlow's gentle proof checker for a student planner. A student completed the task "${taskTitle}" and uploaded this photo as proof. Does it plausibly show study-related work? (notes, notebook, textbook, laptop/document/code screen, whiteboard, flashcards, sketches, a workspace mid- or post-work — blurry or partial photos count.)

Respond ONLY with JSON: {"verified": true or false, "note": "one warm sentence, max 90 characters, about what you see"}
Rules: be generous; if it's clearly unrelated (a meme, only a pet, darkness), verified=false but stay kind. Never shame, never mention consequences.`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    let raw = completion.choices[0]?.message?.content ?? "";
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) raw = fence[1];
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(s, e + 1)) as {
      verified?: boolean;
      note?: string;
    };
    verified = parsed.verified !== false;
    if (parsed.note) note = String(parsed.note).slice(0, 120);
  } catch {
    // VLM unavailable → benefit of the doubt
  }

  const proof = await db.proof.create({
    data: {
      userId: user.id,
      taskId,
      image,
      verified,
      aiNote: note,
      coinsAwarded: PROOF_COINS,
    },
  });

  const fresh = await db.user.update({
    where: { id: user.id },
    data: { coins: { increment: PROOF_COINS } },
  });

  return NextResponse.json({
    proof: {
      id: proof.id,
      taskId: proof.taskId,
      image: proof.image,
      verified: proof.verified,
      aiNote: proof.aiNote,
      coinsAwarded: proof.coinsAwarded,
      createdAt: proof.createdAt,
    },
    note: verified
      ? `Verified! ${note} +${PROOF_COINS} Spoon Coins 🪙`
      : `We couldn't quite tell, but we're taking your word for it. ${note} +${PROOF_COINS} Spoon Coins 🪙`,
    verified,
    wallet: { coins: fresh.coins, tokens: fresh.tokens },
  });
}
