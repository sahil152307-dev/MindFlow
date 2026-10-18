/* ————————————————————————————————
   MindFlow · shared domain types
   Aligned with the Prisma schema (Phase 2)
———————————————————————————————— */

export type EnergyLevel = "low" | "medium" | "high";

export type TaskStatus = "todo" | "doing" | "done" | "skipped";

export type SpoonCost = 1 | 2 | 3;

export type PlannerView = "today" | "insights" | "courses" | "rewards";

export type StuckReason = "too-big" | "where-to-start" | "unclear";

export type PlannerMode = "plan" | "stuck" | "low" | "motivated" | "rest";

/* —– Spoon capacity — deliberately gentle. Single source of truth
   shared by server (priority engine) and client (dashboard chips). –— */
export const CAPACITY: Record<EnergyLevel, number> = {
  low: 2,
  medium: 4,
  high: 7,
};

export const MAX_TASKS: Record<EnergyLevel, number> = {
  low: 2,
  medium: 3,
  high: 5,
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  coins: number;
  tokens: number;
  streakDays: number;
  longestStreak: number;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  color: CourseColor;
  instructor?: string | null;
  createdAt: string;
  assignmentCount?: number;
}

export type CourseColor =
  | "sage"
  | "honey"
  | "rose"
  | "lilac"
  | "peach";

export const COURSE_COLORS: CourseColor[] = [
  "sage",
  "honey",
  "rose",
  "lilac",
  "peach",
];

export interface Assignment {
  id: string;
  courseId?: string | null;
  course?: Course | null;
  title: string;
  description?: string | null;
  dueDate: string;
  status: "active" | "done";
  createdAt: string;
  taskCount?: number;
  doneTaskCount?: number;
}

export interface Task {
  id: string;
  assignmentId?: string | null;
  assignment?: Assignment | null;
  title: string;
  notes?: string | null;
  status: TaskStatus;
  spoonCost: SpoonCost;
  position: number;
  isMicro: boolean;
  plannedDate?: string | null;
  completedAt?: string | null;
  rolledCount: number;
  createdAt: string;
  hasProof?: boolean;
}

export interface EnergyLog {
  id: string;
  date: string;
  level: EnergyLevel;
  note?: string | null;
}

export interface ProofRecord {
  id: string;
  taskId: string;
  taskTitle?: string;
  image: string;
  verified: boolean;
  aiNote?: string | null;
  coinsAwarded: number;
  createdAt: string;
}

export interface ModeLogEntry {
  id: string;
  mode: PlannerMode;
  createdAt: string;
}

export interface Goodie {
  key: string;
  name: string;
  tagline: string;
  cost: number;
  emoji: string;
  accent: CourseColor;
  claimed?: boolean;
}

export interface Wallet {
  coins: number;
  tokens: number;
  streakDays: number;
  longestStreak: number;
  weekProgress: number; // 0..7 consistent days this week
  nextTokenPayout: number; // consistent days remaining for the weekly 7-token payout
  proofs: ProofRecord[];
  goodies: Goodie[];
  consistentToday: boolean;
}

export interface MicroStep {
  title: string;
  spoonCost: SpoonCost;
  note?: string;
}

export interface BreakdownResult {
  microSteps: MicroStep[];
  encouragement: string;
  source: "ai" | "heuristic";
}

export interface ReasonChip {
  text: string;
  tone: "sage" | "honey" | "lilac" | "peach";
}

export interface PlanSuggestion {
  task: Task;
  reason: string;
  reasons?: ReasonChip[];
}

export interface DayPlan {
  suggestions: PlanSuggestion[];
  summary: string;
  capacity: number;
}

/* —– "What should I do now?" (decision-paralysis valve) –— */
export interface NowOption {
  kind: "gentlest" | "useful" | "fivemin";
  task: {
    id: string;
    title: string;
    spoonCost: number;
    isMicro: boolean;
    rolledCount: number;
    assignmentId: string | null;
    planned: "today" | "overdue" | "unplanned";
    onToday: boolean;
    dueInDays: number | null;
    assignmentTitle: string | null;
  };
  reasons: ReasonChip[];
}

export interface NowResponse {
  context: {
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    energy: EnergyLevel | null;
    openCount: number;
    doneToday: number;
  };
  options: NowOption[];
  breakdownTarget: NowOption["task"] | null;
}

/* —– "Today's gentle read" (AI adaptive recommendation) –— */
export interface Recommendation {
  headline: string;
  body: string;
  microAction: string;
  source: "ai" | "heuristic";
}

/* —– Student Insights & Analytics (patterns, never grades) –— */
export interface InsightsResponse {
  wallet: {
    coins: number;
    tokens: number;
    streakDays: number;
    longestStreak: number;
    totalProofs: number;
  };
  energy: { date: string; label: string; value: number | null }[]; // last 14 days, null = no check-in
  completions: { date: string; label: string; count: number }[]; // last 14 days
  modes: { mode: string; count: number }[]; // last 7 days, PRD order
  study: {
    courses: number;
    assignmentsTotal: number;
    assignmentsDone: number;
    microDone: number;
    rolledTotal: number;
    letGoTotal: number;
  };
  patterns: string[];
}

/* —– Gentle copy bank (anti-shame tone) –— */
export const GENTLE_NOTES = [
  "Small steps still count.",
  "You're allowed to go slow.",
  "Progress, not perfection.",
  "Rest is part of the work.",
  "Showing up is the win.",
];
