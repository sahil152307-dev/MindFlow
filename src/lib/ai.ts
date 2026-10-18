import { db } from "@/lib/db";
import { daysBetween, startOfDay } from "@/lib/session";
import type { MicroStep, Recommendation } from "@/lib/types";

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

/* ————————————————————————————————
   AI Adaptive Recommendation —
   "Today's gentle read". The LLM looks
   at the WHOLE context (energy trend,
   streak, workload, mode habits) and
   writes one short, kind paragraph.
   Falls back to honest templates so
   the read never disappears.
———————————————————————————————— */

export { type Recommendation };

const READ_PROMPT = `You are MindFlow's Daily Gentle Read — a warm, emotionally intelligent companion for a university student with ADHD/anxiety.
Given their whole context, write ONE short adaptive recommendation for today.

Rules:
- headline: max 48 characters, warm, human. Never generic ("You got this") — reflect their actual situation.
- body: 2-3 sentences max, under 240 characters total. Concrete, specific to their data. Acknowledge energy level honestly.
- microAction: ONE 5-10 minute physical action starting with a verb (Open, List, Find, Write...). Almost embarrassingly small.
- NEVER shame, nag, or mention lateness, deadlines pressure, or consequences. No "just", "simply", "easy".
- If energy is low, celebrate smallness. If they already completed something today, acknowledge it first.
- Zero guilt framing, even for overdue work — "taking its time" language.

Respond ONLY with valid JSON: {"headline":"...","body":"...","microAction":"..."}`;

interface ReadSignals {
  energyToday: "low" | "medium" | "high" | null;
  energyTrend: string[]; // last 5 days, oldest first, e.g. "high"
  doneToday: number;
  openCount: number;
  overdueCount: number;
  dueSoonTitles: string[]; // due within 48h
  heaviestRolled: { title: string; count: number } | null;
  streakDays: number;
  longestStreak: number;
  coins: number;
  modeWeek: Record<string, number>;
  timeOfDay: string;
}

export async function generateRecommendation(
  userId: string
): Promise<Recommendation> {
  const today = startOfDay();

  const [user, energyLogs, doneToday, openTasks, modeLogs] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.energyLog.findMany({
      where: { userId, date: { gte: new Date(today.getTime() - 4 * 864e5) } },
      orderBy: { date: "asc" },
    }),
    db.task.count({
      where: { userId, status: "done", completedAt: { gte: today } },
    }),
    db.task.findMany({
      where: {
        userId,
        status: { in: ["todo", "doing"] },
        OR: [{ plannedDate: null }, { plannedDate: { lte: today } }],
      },
      include: { assignment: true },
    }),
    db.modeLog.findMany({
      where: { userId, createdAt: { gte: new Date(today.getTime() - 7 * 864e5) } },
    }),
  ]);

  const energyToday =
    (energyLogs.find((l) => l.date.getTime() === today.getTime())?.level as
      | "low"
      | "medium"
      | "high"
      | undefined) ?? null;

  const hour = new Date().getHours();
  const timeOfDay =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 23 ? "evening" : "night";

  const dueSoonTitles = openTasks
    .filter(
      (t) => t.assignment && daysBetween(today, t.assignment.dueDate) <= 2
    )
    .map((t) => t.title)
    .slice(0, 4);

  const heaviestRolled = openTasks.reduce<
    { title: string; count: number } | null
  >((acc, t) => (t.rolledCount > (acc?.count ?? 0) ? { title: t.title, count: t.rolledCount } : acc), null);

  const modeWeek: Record<string, number> = {};
  for (const m of modeLogs) modeWeek[m.mode] = (modeWeek[m.mode] ?? 0) + 1;

  const signals: ReadSignals = {
    energyToday,
    energyTrend: energyLogs.map((l) => l.level),
    doneToday,
    openCount: openTasks.length,
    overdueCount: openTasks.filter(
      (t) => t.plannedDate && daysBetween(today, t.plannedDate) < 0
    ).length,
    dueSoonTitles,
    heaviestRolled,
    streakDays: user?.streakDays ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    coins: user?.coins ?? 0,
    modeWeek,
    timeOfDay,
  };

  const userPrompt = [
    `Time of day: ${signals.timeOfDay}`,
    `Energy today: ${signals.energyToday ?? "not checked in yet"}`,
    signals.energyTrend.length > 1
      ? `Energy last ${signals.energyTrend.length} days: ${signals.energyTrend.join(" → ")}`
      : null,
    `Completed today: ${signals.doneToday}`,
    `Open tasks: ${signals.openCount}`,
    signals.overdueCount > 0
      ? `Tasks taking their time (past planned day, framed kindly): ${signals.overdueCount}`
      : null,
    signals.dueSoonTitles.length > 0
      ? `Due within 48h: ${signals.dueSoonTitles.join("; ")}`
      : null,
    signals.heaviestRolled && signals.heaviestRolled.count >= 2
      ? `Most-rolled task (needs shrinking, not nagging): "${signals.heaviestRolled.title}" (${signals.heaviestRolled.count}×)`
      : null,
    `Consistency streak: ${signals.streakDays} days (best ${signals.longestStreak})`,
    `Spoon coins: ${signals.coins}`,
    Object.keys(signals.modeWeek).length > 0
      ? `Modes used this week: ${Object.entries(signals.modeWeek)
          .map(([k, v]) => `${k}×${v}`)
          .join(", ")}`
      : null,
    `Student name: ${user?.name ?? "friend"}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: READ_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseReadJson(raw);
    if (parsed) return { ...parsed, source: "ai" };
    throw new Error("unparseable");
  } catch {
    return heuristicRead(signals);
  }
}

function parseReadJson(raw: string): {
  headline: string;
  body: string;
  microAction: string;
} | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    const obj = JSON.parse(text) as {
      headline?: string;
      body?: string;
      microAction?: string;
    };
    const headline = String(obj.headline ?? "").trim().slice(0, 60);
    const body = String(obj.body ?? "").trim().slice(0, 260);
    const microAction = String(obj.microAction ?? "").trim().slice(0, 140);
    if (headline.length >= 4 && body.length >= 20 && microAction.length >= 8) {
      return { headline, body, microAction };
    }
    return null;
  } catch {
    return null;
  }
}

/** Honest, data-driven fallback so the gentle read never disappears. */
function heuristicRead(s: ReadSignals): Recommendation {
  const done = s.doneToday > 0;
  const energy = s.energyToday;

  if (!energy) {
    return {
      headline: "The day shapes itself around you",
      body: done
        ? `You already did ${s.doneToday} thing${s.doneToday === 1 ? "" : "s"} today — that counts, full stop. Whenever you feel like it, a 10-second check-in lets the day fit your spoons.`
        : `No check-in yet, and that's allowed. When you have a second, three taps tell the planner how much today holds.`,
      microAction: "Tap one energy level — low, medium or high. That's the whole step.",
      source: "heuristic",
    };
  }

  if (energy === "low") {
    const overdueNote =
      s.overdueCount > 0
        ? `The ${s.overdueCount} task${s.overdueCount === 1 ? "" : "s"} taking their time can keep waiting; they'll still be there.`
        : "Nothing needs more from you today.";
    return {
      headline: done ? "Tiny already won today" : "Tiny is the whole plan",
      body: done
        ? `You did ${s.doneToday} thing${s.doneToday === 1 ? "" : "s"} on a low-spoon day — genuinely well spent. ${overdueNote}`
        : `Low spoons are information, not a verdict. One almost-nothing step is plenty${s.overdueCount > 0 ? ", and the tasks taking their time can keep waiting" : ""}.`,
      microAction: "Open the one you keep avoiding and look at it for 2 minutes. Looking is doing.",
      source: "heuristic",
    };
  }

  if (energy === "high") {
    return {
      headline: done ? "Momentum, gently held" : "Ride it, don't race it",
      body: done
        ? `${s.doneToday} done and energy to spare — lovely. One more meaningful bite beats a long list, then let the day close soft.`
        : `Good energy today. One or two real bites beat a giant list — pick what actually matters${s.dueSoonTitles.length > 0 ? " (something is due within two days, softly noted)" : ""}.`,
      microAction:
        s.dueSoonTitles.length > 0
          ? `Open "${s.dueSoonTitles[0]}" and do the first 10 minutes of it.`
          : "Pick the one task that would feel best finished, and start its first 10 minutes.",
      source: "heuristic",
    };
  }

  // medium
  return {
    headline: done ? "Steady looks good on you" : "Steady is a good speed",
    body: done
      ? `${s.doneToday} done at medium energy — solid, sustainable pace. One more small thing if you feel like it, or a soft stop.`
      : `Medium energy is the sweet spot for one meaningful task${s.overdueCount > 0 ? ". The ones taking their time can wait or shrink — no rush either way" : ""}.`,
    microAction:
      s.heaviestRolled && s.heaviestRolled.count >= 2
        ? `Open "${s.heaviestRolled.title}" and list its parts for 5 minutes — shrinking counts.`
        : "Open your most useful task and give it a 10-minute first bite.",
    source: "heuristic",
  };
}
