"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Pencil, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { EnergyLevel, SpoonCost } from "@/lib/types";
import { SpoonDots } from "@/components/app/spoon-ui";

interface DraftStep {
  title: string;
  spoonCost: SpoonCost;
  note?: string;
  selected: boolean;
}

/**
 * The AI micro-sequencer panel. Takes a task (or a raw title), asks the
 * sequencer for microscopic steps, and lets the student try / edit / skip
 * each one before anything is saved.
 */
export function BreakdownSheet({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  assignmentId,
  energy = "medium",
  reason,
  planForToday = false,
  onStepsAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId?: string;
  taskTitle?: string;
  assignmentId?: string | null;
  energy?: EnergyLevel;
  reason?: "too-big" | "where-to-start" | "unclear";
  planForToday?: boolean;
  onStepsAdded?: (count: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [encouragement, setEncouragement] = useState("");
  const [source, setSource] = useState<"ai" | "heuristic">("ai");
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSteps([]);
    try {
      const res = await api.breakdown({
        taskId,
        title: taskTitle,
        energy,
        reason,
      });
      setEncouragement(res.encouragement);
      setSource(res.source);
      setSteps(
        res.microSteps.map((s) => ({
          title: s.title,
          spoonCost: s.spoonCost as SpoonCost,
          note: s.note,
          selected: true,
        }))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The sequencer is resting. Try again?");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
     
  }, [taskId, taskTitle, energy, reason]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const selectedCount = steps.filter((s) => s.selected).length;

  async function addSteps() {
    const chosen = steps.filter((s) => s.selected);
    if (chosen.length === 0) {
      toast("Pick at least one step — or skip them all and just breathe.");
      return;
    }
    setSaving(true);
    try {
      await api.createTasks(
        chosen.map((s) => ({ title: s.title, spoonCost: s.spoonCost, notes: s.note })),
        assignmentId ?? null,
        planForToday ? new Date().toISOString() : null
      );
      toast.success(
        planForToday
          ? `${chosen.length} micro-steps added to today. One is enough to start. 🌱`
          : `${chosen.length} micro-steps saved under the assignment. 🌱`
      );
      onStepsAdded?.(chosen.length);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save those.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-4xl border-t border-lilac/40 bg-card px-5 pb-8 pt-6 sm:rounded-4xl sm:px-7"
      >
        <SheetHeader className="text-left">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lilac-soft px-3 py-1 text-xs font-semibold text-lilac-deep">
            <WandSparkles className="h-3.5 w-3.5" aria-hidden />
            Micro-sequencer {source === "ai" ? "· AI" : "· gentle defaults"}
          </div>
          <SheetTitle className="font-display text-2xl leading-tight">
            {loading ? "Finding the smallest first move…" : `“${taskTitle ?? "Your task"}”, in tiny pieces`}
          </SheetTitle>
          <SheetDescription className="text-harmony leading-relaxed">
            {loading
              ? "Shrinking it until it's almost nothing."
              : encouragement}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-8 flex flex-col items-center gap-4 pb-6">
            <span className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-lilac-soft" />
              <Sparkles className="relative h-6 w-6 text-lilac-deep" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">
              Each step will take minutes, not hours.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-5 space-y-2.5">
              {steps.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "rounded-2xl border p-3.5 transition",
                    s.selected
                      ? "border-lilac/40 bg-lilac-soft/25"
                      : "border-border/60 bg-background/40 opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        setSteps((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x))
                        )
                      }
                      aria-pressed={s.selected}
                      aria-label={s.selected ? `Skip step: ${s.title}` : `Try step: ${s.title}`}
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                        s.selected
                          ? "border-lilac bg-lilac text-white"
                          : "border-muted-foreground/30 text-transparent hover:border-lilac"
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      {editing === i ? (
                        <input
                          autoFocus
                          value={s.title}
                          onChange={(e) =>
                            setSteps((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditing(null);
                          }}
                          onBlur={() => setEditing(null)}
                          aria-label="Edit step"
                          className="w-full rounded-lg border border-lilac/50 bg-card px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring/40"
                          maxLength={160}
                        />
                      ) : (
                        <>
                          <p className="text-sm font-medium leading-snug">{s.title}</p>
                          {s.note && (
                            <p className="mt-0.5 text-xs italic text-muted-foreground">{s.note}</p>
                          )}
                        </>
                      )}
                      <div className="mt-1.5 flex items-center gap-3">
                        <SpoonDots cost={s.spoonCost} />
                        <button
                          onClick={() => setEditing(editing === i ? null : i)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-lilac-deep/80 hover:text-lilac-deep"
                        >
                          <Pencil className="h-3 w-3" /> edit
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                className="h-11 rounded-2xl px-5 text-sm text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                Not now
              </Button>
              <Button
                onClick={addSteps}
                disabled={saving || selectedCount === 0}
                className="h-11 rounded-2xl bg-lilac-deep px-6 text-sm font-semibold text-white hover:bg-lilac-deep/90"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    {selectedCount > 0
                      ? `Add ${selectedCount} step${selectedCount === 1 ? "" : "s"}${planForToday ? " to today" : ""}`
                      : "Add steps"}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
