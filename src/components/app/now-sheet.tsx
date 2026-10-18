"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Feather,
  Loader2,
  Signpost,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
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
import type { NowOption, NowResponse, ReasonChip, SpoonCost } from "@/lib/types";
import { SpoonDots } from "@/components/app/spoon-ui";

/**
 * "What should I do now?" — the decision-paralysis valve.
 * One tap, three kind options, zero judgment. Asking for
 * help choosing is a feature, not a failure.
 */

const KIND_META: Record<
  NowOption["kind"],
  { label: string; icon: typeof Feather; ring: string }
> = {
  gentlest: {
    label: "The gentle one",
    icon: Feather,
    ring: "border-sage/40 bg-sage-soft/30",
  },
  useful: {
    label: "The useful one",
    icon: Target,
    ring: "border-honey/40 bg-honey-soft/30",
  },
  fivemin: {
    label: "The five-minute one",
    icon: Timer,
    ring: "border-lilac/40 bg-lilac-soft/30",
  },
};

const CHIP_TONES: Record<ReasonChip["tone"], string> = {
  sage: "bg-sage-soft/80 text-sage-deep",
  honey: "bg-honey-soft/80 text-honey-deep",
  lilac: "bg-lilac-soft/80 text-lilac-deep",
  peach: "bg-peach-soft/80 text-peach-deep",
};

const TIME_LINES: Record<NowResponse["context"]["timeOfDay"], string> = {
  morning: "It's early — one small thing is a great start.",
  afternoon: "Mid-day — one useful nudge beats a long list.",
  evening: "Evenings deserve gentle wins — five minutes counts.",
  night: "It's late. The kindest next step is usually rest — but if you want one thing, here it is.",
};

export function NowCard({
  openCount,
  onFocusTask,
  onTasksChanged,
  onBreakdown,
}: {
  openCount: number;
  onFocusTask: (id: string) => void;
  onTasksChanged: () => void;
  onBreakdown: (t: NowOption["task"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setData(null);
    api
      .getNow()
      .then((d) => setData(d))
      .catch(() => toast.error("Couldn't think right now — try again?"))
      .finally(() => setLoading(false));
  }, [open]);

  async function pick(o: NowOption) {
    setBusyId(o.task.id);
    try {
      if (o.task.planned !== "today") {
        // Overdue or unplanned — bring it into today, gently
        await api.updateTask(o.task.id, { plannedDate: new Date().toISOString() });
        onTasksChanged();
        toast("Brought into today — one thing is a plan. 🌿");
      }
      setOpen(false);
      // Give refresh + layout a beat, then scroll to the card and glow it
      setTimeout(() => onFocusTask(o.task.id), 800);
    } catch {
      toast.error("Couldn't do that — try again?");
    } finally {
      setBusyId(null);
    }
  }

  if (openCount === 0) return null;

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        aria-labelledby="now-heading"
        className="rounded-3xl border border-sage/40 bg-sage-soft/25 p-5 shadow-soft"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sage-soft text-sage-deep">
            <Signpost className="h-4.5 w-4.5" aria-hidden />
          </span>
          <h2 id="now-heading" className="font-display text-lg font-semibold leading-snug">
            What should I do now?
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Paralyzed by the list? Get one kind next step, picked for this
          exact moment — energy, due dates and all.
        </p>
        <Button
          onClick={() => setOpen(true)}
          className="mt-4 h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Signpost className="mr-1.5 h-4 w-4" aria-hidden /> Pick my next step
        </Button>
      </motion.section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-4xl bg-card px-5 pb-8 pt-6 sm:rounded-4xl sm:px-7"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-2xl leading-tight">
              What should I do now?
            </SheetTitle>
            <SheetDescription className="leading-relaxed">
              {data ? TIME_LINES[data.context.timeOfDay] : "One kind step at a time."}
              {data?.context.energy === "low" && " Going easy — everything here is spoon-light."}
              {data && data.context.energy === null && " (No check-in today — going by due dates alone.)"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-3">
            {loading && (
              <div className="flex min-h-32 items-center justify-center" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-sage" />
              </div>
            )}

            {!loading && data && data.options.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted-foreground">
                Nothing open at all — and asking was still a good instinct. 🌤️
              </p>
            )}

            {!loading &&
              data &&
              data.options.map((o, i) => {
                const meta = KIND_META[o.kind];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={o.task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("rounded-2xl border p-4", meta.ring)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {meta.label}
                      </p>
                    </div>
                    <p className="mt-1.5 font-display text-lg font-semibold leading-snug">
                      {o.task.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <SpoonDots cost={o.task.spoonCost as SpoonCost} />
                      {o.task.dueInDays !== null &&
                        o.task.dueInDays <= 7 &&
                        o.task.dueInDays >= 0 && (
                          <span className="text-xs text-honey-deep">
                            due in {o.task.dueInDays} day{o.task.dueInDays === 1 ? "" : "s"}
                          </span>
                        )}
                      {o.task.dueInDays !== null && o.task.dueInDays < 0 && (
                        <span className="text-xs text-peach-deep">
                          due date passed — still no red
                        </span>
                      )}
                    </div>
                    {o.reasons.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {o.reasons.slice(0, 2).map((r) => (
                          <span
                            key={r.text}
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium leading-4",
                              CHIP_TONES[r.tone]
                            )}
                          >
                            {r.text}
                          </span>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={() => pick(o)}
                      disabled={busyId !== null}
                      className="mt-4 h-10 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      {busyId === o.task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : o.task.planned === "today" ? (
                        "Show me"
                      ) : (
                        "Bring it into today & show me"
                      )}
                    </Button>
                  </motion.div>
                );
              })}

            {/* No quick win exists → offer shrinking instead */}
            {!loading && data && data.breakdownTarget && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-lilac/40 bg-lilac-soft/20 p-4"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lilac-deep" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide text-lilac-deep/80">
                    Nothing five-minute-sized yet
                  </p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Let AI shrink{" "}
                  <span className="font-semibold text-foreground">
                    {data.breakdownTarget.title}
                  </span>{" "}
                  into embarrassingly small steps.
                </p>
                <Button
                  onClick={() => {
                    setOpen(false);
                    onBreakdown(data.breakdownTarget!);
                  }}
                  className="mt-3.5 h-10 w-full rounded-2xl bg-lilac-deep text-sm font-semibold text-white hover:bg-lilac-deep/90"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Shrink it for me
                </Button>
              </motion.div>
            )}

            <p className="px-1 pt-1 text-center text-xs leading-relaxed text-muted-foreground">
              Asking is allowed. So is waiting.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
