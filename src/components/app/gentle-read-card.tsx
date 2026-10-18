"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Feather, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useMindFlow } from "@/lib/store";
import type { Recommendation } from "@/lib/types";

/**
 * "Today's gentle read" — the AI adaptive recommendation.
 * Lilac surface (AI is always lilac in MindFlow), whole-context
 * aware, with a kind offline fallback. "Not today" hides it
 * until tomorrow — a new day politely brings it back.
 */
export function GentleReadCard() {
  const readDismissedAt = useMindFlow((s) => s.readDismissedAt);
  const dismissRead = useMindFlow((s) => s.dismissRead);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // "Not today" means today — a new day politely brings the read back.
  const dismissedToday = readDismissedAt === new Date().toDateString();

  useEffect(() => {
    if (dismissedToday) return;
    let alive = true;
    // `loading` already starts true; only async callbacks settle it below.
    api
      .getRecommendation()
      .then((r) => alive && setRec(r.recommendation))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dismissedToday]);

  if (dismissedToday) return null;

  if (loading) {
    return (
      <section
        aria-label="Today's gentle read"
        className="rounded-3xl border border-lilac/40 bg-lilac-soft/15 p-5 shadow-soft"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 animate-pulse rounded-2xl bg-lilac-soft/70" />
          <div className="h-4 w-40 animate-pulse rounded-full bg-lilac-soft/60" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-lilac-soft/40" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-lilac-soft/40" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-lilac-soft/40" />
        </div>
      </section>
    );
  }

  if (failed || !rec) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="read-heading"
      className="rounded-3xl border border-lilac/40 bg-lilac-soft/20 p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-lilac-soft text-lilac-deep">
            <Sparkles className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div>
            <h2 id="read-heading" className="font-display text-lg font-semibold leading-snug">
              Today&apos;s gentle read
            </h2>
            <p className="text-[0.6875rem] font-medium text-lilac-deep/70">
              {rec.source === "ai" ? "written for you, just now" : "offline, still kind"}
            </p>
          </div>
        </div>
        <button
          onClick={dismissRead}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-lilac-soft/50 hover:text-foreground"
        >
          Not today
        </button>
      </div>

      <p className="mt-3.5 font-display text-xl font-semibold leading-snug">
        {rec.headline}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-harmony">
        {rec.body}
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-lilac/30 bg-lilac-soft/35 p-3.5">
        <Feather className="mt-0.5 h-4 w-4 shrink-0 text-lilac-deep" aria-hidden />
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-lilac-deep/80">
            If you want a next step
          </p>
          <p className="mt-0.5 text-sm leading-relaxed">{rec.microAction}</p>
        </div>
      </div>
    </motion.section>
  );
}
