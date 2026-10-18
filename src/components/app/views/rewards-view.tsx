"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Coins,
  Flame,
  Gift,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useMindFlow } from "@/lib/store";
import { shortDate } from "@/lib/format";
import type { Goodie, ProofRecord, Wallet } from "@/lib/types";
import { SectionHeading } from "@/components/app/section-heading";

const MODE_LABELS: Record<string, string> = {
  plan: "Plan my day",
  stuck: "I'm stuck",
  low: "Low energy",
  motivated: "Motivated",
  rest: "Rest",
};

export function RewardsView() {
  const user = useMindFlow((s) => s.user);
  const patchUser = useMindFlow((s) => s.patchUser);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getRewards();
      setWallet(res.wallet);
    } catch {
      toast("Couldn't load your wallet. A refresh usually helps.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // keep the header chip in sync
  useEffect(() => {
    if (wallet && user) {
      patchUser({
        coins: wallet.coins,
        tokens: wallet.tokens,
        streakDays: wallet.streakDays,
        longestStreak: wallet.longestStreak,
      });
    }
     
  }, [wallet?.coins, wallet?.tokens, wallet?.streakDays]);

  async function claim(g: Goodie) {
    setClaiming(g.key);
    try {
      const res = await api.claimGoodie(g.key);
      toast.success(res.message);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't claim that.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading || !wallet) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading rewards">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  const tokenPct = Math.min(100, Math.round((wallet.tokens / wallet.goodieUnlockAt) * 100));
  const modeEntries = Object.entries(wallet.modeCounts ?? {}).filter(([k]) => MODE_LABELS[k]);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Your gentle economy"
        title="Rewards"
        description="Effort in, warmth out. Coins celebrate finished work, tokens honour consistency — and nothing here can ever turn red."
      />

      {/* ——— wallet hero ——— */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="Wallet"
        className="overflow-hidden rounded-3xl border border-sage/25 bg-gradient-to-br from-sage-soft/60 via-card to-lilac-soft/50 p-6 shadow-soft sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-honey-deep">
              <Coins className="h-3.5 w-3.5" aria-hidden /> Spoon Coins
            </p>
            <p className="num mt-1.5 font-display text-4xl font-semibold">{wallet.coins}</p>
            <p className="mt-1 text-xs text-muted-foreground">from verified visual proof</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-lilac-deep">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Tokens
            </p>
            <p className="num mt-1.5 font-display text-4xl font-semibold">{wallet.tokens}</p>
            <p className="mt-1 text-xs text-muted-foreground">+7 for every 7-day flow</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-deep">
              <Flame className="h-3.5 w-3.5" aria-hidden /> Current flow
            </p>
            <p className="num mt-1.5 font-display text-4xl font-semibold">
              {wallet.streakDays}
              <span className="text-lg font-medium text-muted-foreground"> days</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              longest {wallet.longestStreak} · today{" "}
              {wallet.consistentToday ? "✓ counted" : "— not yet, and that's fine"}
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">This week&apos;s flow</span>
              <span className="num text-sage-deep">
                {wallet.weekProgress}/7 · payout in {wallet.daysToPayout} day
                {wallet.daysToPayout === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1.5" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2.5 flex-1 rounded-full transition-colors",
                    i < wallet.weekProgress ? "bg-sage" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                Road to the {wallet.goodieUnlockAt}-token shelf
              </span>
              <span className="num text-lilac-deep">
                {wallet.tokens}/{wallet.goodieUnlockAt}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tokenPct}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 20 }}
                className="h-full rounded-full bg-gradient-to-r from-lilac to-sage"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ——— proof gallery ——— */}
      <section aria-labelledby="proofs-heading">
        <h2 id="proofs-heading" className="font-display text-xl font-semibold">
          Your wins, seen &amp; believed
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {wallet.totalProofs} photo{wallet.totalProofs === 1 ? "" : "s"} of honest work.
          {" "}
          {wallet.proofs.length === 0 && "Upload one from Today's wins — +10 coins each time."}
        </p>

        {wallet.proofs.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {wallet.proofs.map((p: ProofRecord, i: number) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  { }
                  <img
                    src={p.image}
                    alt={`Proof for: ${p.taskTitle ?? "completed task"}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span
                    className={cn(
                      "absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.625rem] font-semibold backdrop-blur",
                      p.verified
                        ? "bg-sage/90 text-white"
                        : "bg-honey/90 text-white"
                    )}
                  >
                    <BadgeCheck className="h-3 w-3" aria-hidden />
                    {p.verified ? "verified" : "trusted"}
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold">{p.taskTitle ?? "A finished task"}</p>
                  <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug text-muted-foreground">
                    {p.aiNote}
                  </p>
                  <p className="num mt-1.5 flex items-center gap-1 text-[0.6875rem] font-semibold text-honey-deep">
                    <Coins className="h-3 w-3" aria-hidden /> +{p.coinsAwarded} · {shortDate(p.createdAt)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-honey/70" aria-hidden />
            <p className="mt-2 text-sm font-medium">No proof photos yet.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Finish a task on Today, tap “Show your win”, and snap your notes,
              screen or workspace. The coins follow.
            </p>
          </div>
        )}
      </section>

      {/* ——— goodie shelf ——— */}
      <section aria-labelledby="goodies-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="goodies-heading" className="font-display text-xl font-semibold">
            The goodie shelf
          </h2>
          <p className="text-xs text-muted-foreground">
            flagship unlocks at {wallet.goodieUnlockAt} tokens 🎁
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens come from consistency — 7 for every 7-day flow. No purchases,
          no pressure, just patience rewarded.
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wallet.goodies.map((g: Goodie, i: number) => {
            const missing = Math.max(0, g.cost - wallet.tokens);
            return (
              <motion.li
                key={g.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex flex-col rounded-3xl border p-5 shadow-soft",
                  g.claimed
                    ? "border-sage/40 bg-sage-soft/40"
                    : g.unlocked
                      ? "border-lilac/50 bg-lilac-soft/30"
                      : "border-border/70 bg-card"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl" aria-hidden>
                    {g.emoji}
                  </span>
                  {g.claimed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-white">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> yours
                    </span>
                  ) : (
                    <span className="num inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-lilac-deep">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {g.cost}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-base font-semibold leading-snug">
                  {g.name}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {g.tagline}
                </p>
                {g.claimed ? (
                  <p className="mt-4 text-xs font-medium text-sage-deep">
                    Claimed — it&apos;s on its way, slowly and kindly. 🎉
                  </p>
                ) : (
                  <Button
                    size="sm"
                    disabled={!g.unlocked || claiming === g.key}
                    onClick={() => claim(g)}
                    className={cn(
                      "mt-4 h-10 rounded-2xl text-xs font-semibold",
                      g.unlocked
                        ? "bg-lilac-deep text-white hover:bg-lilac-deep/90"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {claiming === g.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : g.unlocked ? (
                      <>
                        <Gift className="mr-1.5 h-3.5 w-3.5" /> Claim goodie
                      </>
                    ) : (
                      `${missing} token${missing === 1 ? "" : "s"} to go`
                    )}
                  </Button>
                )}
              </motion.li>
            );
          })}
        </ul>
      </section>

      {/* ——— gentle insights ——— */}
      {modeEntries.length > 0 && (
        <section
          aria-label="This week's gentle insights"
          className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft"
        >
          <h2 className="font-display text-lg font-semibold">This week, you reached for</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {modeEntries.map(([mode, count]) => (
              <li
                key={mode}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {MODE_LABELS[mode]} ×{count}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Using your tools is the work. Whether you planned, shrank, rested or
            rode a wave — it all counts.
          </p>
        </section>
      )}
    </div>
  );
}
