import { db } from "@/lib/db";
import { addDays, daysBetween, startOfDay } from "@/lib/session";

/* ————————————————————————————————
   MindFlow reward math
   – Spoon Coins: +10 per task completed with visual proof
     (always awarded — verification adds delight, never punishment)
   – Consistency: any day with ≥1 completed task counts
   – Streak: consecutive consistent days
   – Weekly payout: every 7 consecutive consistent days → +7 tokens
———————————————————————————————— */

export const PROOF_COINS = 10;
export const WEEK_TOKENS = 7;
export const STREAK_WEEK = 7;
export const GOODIE_UNLOCK = 300;

export interface CompletionResult {
  streakDays: number;
  longestStreak: number;
  tokensAwarded: number;
  weekProgress: number;
  firstWinToday: boolean;
  message: string;
}

/**
 * Call after a task is marked done. Updates streak + weekly token payout.
 * Idempotent within the same day (second completion doesn't double-count).
 */
export async function registerCompletion(userId: string): Promise<CompletionResult> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("user not found");

  const today = startOfDay();
  const last = user.lastActiveDay ? startOfDay(user.lastActiveDay) : null;
  const gap = last ? daysBetween(last, today) : null;

  // Already consistent today → nothing to change, no double payout
  if (gap === 0) {
    return {
      streakDays: user.streakDays,
      longestStreak: user.longestStreak,
      tokensAwarded: 0,
      weekProgress: weekProgressOf(user.streakDays),
      firstWinToday: false,
      message: "Another win today — lovely.",
    };
  }

  const streakDays = gap === 1 ? user.streakDays + 1 : 1;
  const longestStreak = Math.max(user.longestStreak, streakDays);
  const tokensAwarded =
    streakDays > 0 && streakDays % STREAK_WEEK === 0 ? WEEK_TOKENS : 0;

  await db.user.update({
    where: { id: userId },
    data: {
      streakDays,
      longestStreak,
      tokens: user.tokens + tokensAwarded,
      lastActiveDay: today,
    },
  });

  let message =
    streakDays === 1
      ? "First win of a fresh flow. 🌱"
      : `Day ${streakDays} of your flow. Keep going gently.`;
  if (tokensAwarded > 0) {
    message = `A full week of consistency — +${WEEK_TOKENS} tokens! 🌿`;
  }

  return {
    streakDays,
    longestStreak,
    tokensAwarded,
    weekProgress: weekProgressOf(streakDays),
    firstWinToday: true,
    message,
  };
}

/** Progress within the current 7-day consistency window (1..7). */
export function weekProgressOf(streakDays: number): number {
  if (streakDays <= 0) return 0;
  const p = streakDays % STREAK_WEEK;
  return p === 0 ? STREAK_WEEK : p;
}

/** How many consistent days until the next weekly payout. */
export function daysToPayout(streakDays: number): number {
  return STREAK_WEEK - weekProgressOf(streakDays);
}

export { addDays, startOfDay };
