import { db } from "@/lib/db";
import { daysBetween, startOfDay } from "@/lib/session";
import type { MicroStep } from "@/lib/types";

/* ————————————————————————————————
   MindFlow AI Task Micro-Sequencer
   Server-side only (z-ai-web-dev-sdk).
   Breaks one task into microscopic,
   low-dopamine-threshold steps that fit
   the user's live cognitive capacity.
———————————————————————————————— */

const SYSTEM_PROMPT = `You are MindFlow's Task Micro-Sequencer — an empathetic planning assistant for university students with ADHD, anxiety, and executive dysfunction.

Your one job: break a single task into 3-6 MICROSCOPIC, concrete, low-dopamine-threshold steps.

Rules:
- Each step must take 10 minutes or less. On LOW energy days, 5 minutes or less.
- Every step starts with a physical action verb: Open, Write, Find, Read, Type, Circle, List, Sketch, Send, Copy…
- Steps must be embarrassingly small. "Open the document and type your name" is a perfect step. "Write the essay" is forbidden.
- Sequence them so the first step is the easiest possible entry point.
- NEVER mention deadlines, lateness, consequences, or productivity. No shame language, ever. No "just", no "simply", no "easy".
- Be warm, brief, and concrete.

Respond ONLY with valid JSON in exactly this shape:
{"microSteps":[{"title":"...","spoonCost":1,"note":"optional kind aside, max 80 chars"}],"encouragement":"one gentle sentence"}
spoonCost is an integer 1-3 (how much energy the step needs). 3-6 microSteps total.`;

const ENERGY_NOTE: Record<string, string> = {
  low: "The user's energy today is LOW (few spoons). Make every step 5 minutes or less, and prefer steps that are almost passive (opening, reading, listing).",
  medium: "The user's energy today is MEDIUM. Steps of 5-10 minutes are fine.",
  high: "The user's energy today is HIGH. Still keep steps under 10 minutes, but they can be more substantive.",
};

const REASON_NOTE: Record<string, string> = {
  "too-big": "The student is stuck because the task feels TOO BIG. Shrink it aggressively — the first step should feel almost silly.",
  "where-to-start": "The student is stuck because they DON'T KNOW WHERE TO START. Make step one an ultra-obvious physical action.",
  unclear: "The student is stuck because the INSTRUCTIONS ARE UNCLEAR. Early steps should decode the instructions (re-read, rewrite in own words, list questions to ask).",
};

export interface BreakdownRequest {
  taskId?: string;
  title?: string;
  context?: string;
  energy: "low" | "medium" | "high";
  reason?: "too-big" | "where-to-start" | "unclear";
  userId: string;
}

export interface BreakdownResponse {
  microSteps: MicroStep[];
  encouragement: string;
  source: "ai" | "heuristic";
  taskTitle: string;
  assignmentId?: string | null;
}

export async function generateBreakdown(
  req: BreakdownRequest
): Promise<BreakdownResponse> {
  let taskTitle = req.title?.trim() ?? "";
  let assignmentId: string | null = null;
  let contextText = req.context?.trim() ?? "";

  // Enrich from the stored task + assignment when possible
  if (req.taskId) {
    const task = await db.task.findFirst({
      where: { id: req.taskId, userId: req.userId },
      include: { assignment: true },
    });
    if (task) {
      taskTitle = taskTitle || task.title;
      assignmentId = task.assignmentId;
      if (task.assignment) {
        const days = daysBetween(startOfDay(), task.assignment.dueDate);
        contextText =
          contextText ||
          [
            `Assignment: ${task.assignment.title}`,
            task.assignment.description
              ? `Instructions: ${task.assignment.description}`
              : null,
            `Due in ${days} day(s).`,
          ]
            .filter(Boolean)
            .join("\n");
      }
    }
  }

  if (!taskTitle) {
    throw new Error("Nothing to break down — which task is it?");
  }

  const userPrompt = [
    `Task to break down: "${taskTitle}"`,
    contextText ? `Context:\n${contextText}` : null,
    ENERGY_NOTE[req.energy] ?? ENERGY_NOTE.medium,
    req.reason ? REASON_NOTE[req.reason] : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseStepsJson(raw);

    if (parsed.microSteps.length >= 2) {
      return {
        microSteps: parsed.microSteps,
        encouragement:
          parsed.encouragement || "Small enough is the whole trick. 🌿",
        source: "ai",
        taskTitle,
        assignmentId,
      };
    }
    throw new Error("unparseable");
  } catch {
    // The planner must never hard-fail a stuck student.
    return {
      microSteps: heuristicSteps(req.reason),
      encouragement: "Here's a gentle path — one almost-nothing step at a time.",
      source: "heuristic",
      taskTitle,
      assignmentId,
    };
  }
}

function parseStepsJson(raw: string): { microSteps: MicroStep[]; encouragement: string } {
  let text = raw.trim();
  // strip markdown fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  // grab the outermost JSON object
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  try {
    const obj = JSON.parse(text) as {
      microSteps?: { title?: string; spoonCost?: number; note?: string }[];
      encouragement?: string;
    };
    const steps = (obj.microSteps ?? [])
      .map((s) => ({
        title: String(s.title ?? "").trim().slice(0, 160),
        spoonCost: (Math.min(3, Math.max(1, Number(s.spoonCost) || 1)) as 1 | 2 | 3),
        note: s.note ? String(s.note).slice(0, 120) : undefined,
      }))
      .filter((s) => s.title.length > 0)
      .slice(0, 8);
    return { microSteps: steps, encouragement: String(obj.encouragement ?? "") };
  } catch {
    return { microSteps: [], encouragement: "" };
  }
}

function heuristicSteps(
  reason?: "too-big" | "where-to-start" | "unclear"
): MicroStep[] {
  if (reason === "where-to-start") {
    return [
      { title: "Open the file or materials and just look at them for 2 minutes", spoonCost: 1, note: "Looking is doing." },
      { title: "Circle or highlight one thing you could do first", spoonCost: 1 },
      { title: "Do that one circled thing for 10 minutes", spoonCost: 2 },
      { title: "Write one line about where you stopped, then close it", spoonCost: 1 },
    ];
  }
  if (reason === "unclear") {
    return [
      { title: "Re-read the instructions once, slowly", spoonCost: 1 },
      { title: "Rewrite the instructions in your own words (3 lines max)", spoonCost: 1 },
      { title: "Underline the single most confusing word", spoonCost: 1 },
      { title: "Draft one short question to send the instructor", spoonCost: 1 },
    ];
  }
  return [
    { title: "List every part this task has — messy bullets are fine", spoonCost: 1 },
    { title: "Pick the easiest single part", spoonCost: 1 },
    { title: "Do that easiest part for 10 minutes (timer optional)", spoonCost: 2 },
    { title: "Note where you stopped, then close it kindly", spoonCost: 1 },
  ];
}
