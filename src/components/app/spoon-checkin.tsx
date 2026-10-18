"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { EnergyLevel, EnergyLog } from "@/lib/types";
import { SpoonGlyph } from "@/components/app/spoon-ui";

const OPTIONS: {
  level: EnergyLevel;
  title: string;
  hint: string;
  selected: string;
  hover: string;
  spoons: number;
}[] = [
  {
    level: "low",
    title: "Low",
    hint: "Running on fumes — we'll go tiny",
    selected: "border-rose bg-rose-soft/60 text-rose-deep",
    hover: "hover:border-rose/60 hover:bg-rose-soft/40",
    spoons: 1,
  },
  {
    level: "medium",
    title: "Medium",
    hint: "Steady enough for a balanced bite",
    selected: "border-honey bg-honey-soft/60 text-honey-deep",
    hover: "hover:border-honey/70 hover:bg-honey-soft/40",
    spoons: 2,
  },
  {
    level: "high",
    title: "High",
    hint: "Plentiful — a bigger gentle bite",
    selected: "border-sage bg-sage-soft/60 text-sage-deep",
    hover: "hover:border-sage/70 hover:bg-sage-soft/40",
    spoons: 3,
  },
];

export function SpoonCheckIn({
  current,
  onChecked,
  onPendingPlan,
}: {
  current: EnergyLog | null;
  onChecked: (log: EnergyLog, changed: boolean) => void;
  onPendingPlan?: (pending: boolean) => void;
}) {
  const [saving, setSaving] = useState<EnergyLevel | null>(null);

  async function check(level: EnergyLevel) {
    setSaving(level);
    onPendingPlan?.(true);
    try {
      const { log } = await api.checkIn(level);
      onChecked(log, current?.level !== level);
    } finally {
      setSaving(null);
      onPendingPlan?.(false);
    }
  }

  return (
    <section
      aria-labelledby="checkin-heading"
      className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="checkin-heading" className="font-display text-lg font-semibold">
            How are today&apos;s spoons?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            No wrong answer. This just tells us how gently to plan your day.
          </p>
        </div>
        {current && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 h-8 gap-1.5 rounded-full px-3 text-xs text-muted-foreground"
            onClick={() => onChecked(current, true)}
            title="Re-check-in any time"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Change
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const active = current?.level === opt.level;
          return (
            <button
              key={opt.level}
              onClick={() => !active && check(opt.level)}
              disabled={active || saving !== null}
              aria-pressed={active}
              className={cn(
                "group flex min-h-[44px] flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? opt.selected
                  : cn("border-border/80 bg-background", opt.hover),
                saving === opt.level && "opacity-70"
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {saving === opt.level ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex gap-0.5">
                      {Array.from({ length: opt.spoons }).map((_, i) => (
                        <SpoonGlyph key={i} className="h-3.5 w-3.5" />
                      ))}
                    </span>
                  )}
                  {opt.title}
                </span>
                {active && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xs font-semibold"
                  >
                    ✓ logged
                  </motion.span>
                )}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
