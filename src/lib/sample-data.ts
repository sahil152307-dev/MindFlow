import { db } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/session";

/**
 * Sample data for "Explore with sample data" — a believable student
 * semester that shows every feature in its best light: courses,
 * assignments with real due dates, today's plan, an overdue task for
 * the gentle rollover, AI micro-steps, and one past win with proof.
 */
export async function seedSampleData(userId: string) {
  const now = new Date();
  const today = startOfDay(now);

  const [psy, ds, design] = await Promise.all([
    db.course.create({
      data: { userId, name: "Cognitive Psychology", color: "sage", instructor: "Dr. Meera" },
    }),
    db.course.create({
      data: { userId, name: "Data Structures", color: "lilac", instructor: "Prof. Rao" },
    }),
    db.course.create({
      data: { userId, name: "Design Studio", color: "peach", instructor: "Ines K." },
    }),
  ]);

  const [essay, dsProject, persona, quiz] = await Promise.all([
    db.assignment.create({
      data: {
        userId,
        courseId: psy.id,
        title: "Essay — Working memory & attention",
        description:
          "2,000 words on how working memory constraints affect attention in students. Cite at least 4 papers.",
        dueDate: addDays(today, 3),
      },
    }),
    db.assignment.create({
      data: {
        userId,
        courseId: ds.id,
        title: "AVL tree project — milestone 2",
        description:
          "Implement rotations and write unit tests. Submit as a private repo with README.",
        dueDate: addDays(today, 6),
      },
    }),
    db.assignment.create({
      data: {
        userId,
        courseId: design.id,
        title: "Persona + journey map",
        description: "Pick a real user, interview them, map their journey with our tool.",
        dueDate: addDays(today, 9),
      },
    }),
    db.assignment.create({
      data: {
        userId,
        courseId: psy.id,
        title: "Reading quiz — chapter 7",
        dueDate: addDays(today, 1),
      },
    }),
  ]);

  const tasks = [
    // —– gently overdue (for the anti-shame rollover) ––
    {
      title: "Skim chapter 7 once",
      notes: "Just skim — highlight anything that jumps out.",
      spoonCost: 1,
      assignmentId: quiz.id,
      plannedDate: addDays(today, -1),
      rolledCount: 1,
    },
    // —– today's gentle plan ––
    {
      title: "Freewrite for 10 minutes about the essay angle",
      notes: "No editing. Ugly first thoughts are perfect thoughts.",
      spoonCost: 1,
      assignmentId: essay.id,
      plannedDate: today,
      isMicro: true,
    },
    {
      title: "Open the AVL repo and read last milestone's feedback",
      spoonCost: 1,
      assignmentId: dsProject.id,
      plannedDate: today,
      isMicro: true,
    },
    {
      title: "Write the left-rotation function (just left)",
      notes: "Right one comes tomorrow. Small bites.",
      spoonCost: 2,
      assignmentId: dsProject.id,
      plannedDate: today,
      isMicro: true,
    },
    // —– backlog (available to plan) ––
    {
      title: "Find and bookmark 4 papers for the essay",
      spoonCost: 2,
      assignmentId: essay.id,
    },
    {
      title: "Draft interview questions for the persona",
      spoonCost: 2,
      assignmentId: persona.id,
    },
    {
      title: "Mind-map the journey map structure",
      spoonCost: 1,
      assignmentId: persona.id,
    },
    {
      title: "Unit tests for insert()",
      spoonCost: 3,
      assignmentId: dsProject.id,
    },
  ];

  let position = 0;
  for (const t of tasks) {
    await db.task.create({ data: { userId, position: position++, ...t } });
  }

  // —– a past win, with proof (the dopamine loop in action) ––
  const pastWin = await db.task.create({
    data: {
      userId,
      title: "Set up the AVL repo skeleton",
      assignmentId: dsProject.id,
      spoonCost: 1,
      status: "done",
      completedAt: addDays(today, -2),
      plannedDate: addDays(today, -2),
    },
  });

  await db.proof.create({
    data: {
      userId,
      taskId: pastWin.id,
      image: sampleProofSvg(),
      verified: true,
      aiNote: "A tidy repo skeleton — that's a real start. Lovely.",
      coinsAwarded: 10,
      createdAt: addDays(today, -2),
    },
  });

  // —– energy history for the last few days ––
  await db.energyLog.createMany({
    data: [
      { userId, date: addDays(today, -2), level: "medium" },
      { userId, date: addDays(today, -1), level: "low" },
    ],
  });

  // wallet that reflects the journey so far
  await db.user.update({
    where: { id: userId },
    data: {
      coins: 40,
      tokens: 7,
      streakDays: 2,
      longestStreak: 5,
      lastActiveDay: addDays(today, -1),
    },
  });
}

/** A soft little SVG that stands in for a "photo of my notes". */
function sampleProofSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="640" height="420" fill="#fbf6ec"/>
  <rect x="24" y="24" width="592" height="372" rx="18" fill="#fffdf8" stroke="#e7ddc9" stroke-width="2"/>
  <line x1="120" y1="24" x2="120" y2="396" stroke="#f0c9c0" stroke-width="2"/>
  <g stroke="#8a7f6d" stroke-width="3" stroke-linecap="round" opacity="0.7">
    <line x1="150" y1="70" x2="420" y2="70"/>
    <line x1="150" y1="105" x2="380" y2="105"/>
    <line x1="150" y1="140" x2="450" y2="140"/>
    <line x1="150" y1="175" x2="300" y2="175"/>
    <line x1="150" y1="230" x2="430" y2="230"/>
    <line x1="150" y1="265" x2="390" y2="265"/>
    <line x1="150" y1="300" x2="460" y2="300"/>
  </g>
  <g fill="#7c9a7e">
    <circle cx="480" cy="105" r="8" opacity="0.8"/>
    <circle cx="510" cy="105" r="8" opacity="0.5"/>
  </g>
  <text x="150" y="360" font-family="Georgia, serif" font-size="22" fill="#5f7a61">AVL skeleton ✓ done enough for today</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
