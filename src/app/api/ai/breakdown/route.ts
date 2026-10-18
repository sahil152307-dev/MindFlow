import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateBreakdown } from "@/lib/ai";

/**
 * The AI Task Micro-Sequencer endpoint (the "RAG/LLM layer" from the TRD).
 * Breaks a task into micro-steps sized to the user's live energy.
 * Falls back to a gentle heuristic so a stuck student is never blocked.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const energy = ["low", "medium", "high"].includes(body.energy)
    ? body.energy
    : "medium";
  const reason = ["too-big", "where-to-start", "unclear"].includes(body.reason)
    ? body.reason
    : undefined;

  if (!body.taskId && !String(body.title ?? "").trim()) {
    return NextResponse.json(
      { error: "Which task should we shrink?" },
      { status: 400 }
    );
  }

  try {
    const result = await generateBreakdown({
      taskId: body.taskId,
      title: body.title,
      context: body.context,
      energy,
      reason,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("breakdown error", err);
    return NextResponse.json(
      { error: "The sequencer tripped over itself. Try once more?" },
      { status: 500 }
    );
  }
}
