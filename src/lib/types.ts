/* ————————————————————————————————
   MindFlow · shared domain types
   Aligned with the Prisma schema (Phase 2)
———————————————————————————————— */

export type EnergyLevel = "low" | "medium" | "high";

export type TaskStatus = "todo" | "doing" | "done" | "skipped";

export type SpoonCost = 1 | 2 | 3;

export type PlannerView = "today" | "courses" | "rewards";

export type StuckReason = "too-big" | "where-to-start" | "unclear";

export type PlannerMode = "plan" | "stuck" | "low" | "motivated" | "rest";

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

export interface PlanSuggestion {
  task: Task;
  reason: string;
}

export interface DayPlan {
  suggestions: PlanSuggestion[];
  summary: string;
  capacity: number;
}

/* —– Gentle copy bank (anti-shame tone) –— */
export const GENTLE_NOTES = [
  "Small steps still count.",
  "You're allowed to go slow.",
  "Progress, not perfection.",
  "Rest is part of the work.",
  "Showing up is the win.",
];
