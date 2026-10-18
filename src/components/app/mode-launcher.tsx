"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryLow,
  Bed,
  Compass,
  Loader2,
  Sparkles,
  Zap,
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
import type { EnergyLog, PlannerMode, SpoonCost, Task } from "@/lib/types";
import { SpoonDots } from "@/components/app/spoon-ui";
import { BreakdownSheet } from "@/components/app/breakdown-sheet";
import { SuggestionCard } from "@/components/app/suggestion-card";

/* ———————————————————————————— Launcher ———————————————————————————— */

const MODES: {
  key: PlannerMode;
  label: string;
  hint: string;
  icon: typeof Compass;
  classes: string;
}[] = [
  {
    key: "plan",
    label: "Plan my day",
    hint: "Shape today around my spoons",
    icon: Compass,
    classes: "border-sage/40 bg-sage-soft/40 hover:bg-sage-soft/70",
  },
  {
    key: "stuck",
    label: "I'm stuck",
    hint: "Shrink the next thing",
    icon: Sparkles,
    classes: "border-lilac/40 bg-lilac-soft/40 hover:bg-lilac-soft/70",
  },
  {
    key: "low",
    label: "Low energy",
    hint: "Go lighter today",
    icon: BatteryLow,
    classes: "border-rose/40 bg-rose-soft/40 hover:bg-rose-soft/70",
  },
  {
    key: "motivated",
    label: "Motivated",
    hint: "Take on a bit more",
    icon: Zap,
    classes: "border-honey/50 bg-honey-soft/50 hover:bg-honey-soft/80",
  },
  {
    key: "rest",
    label: "Rest",
    hint: "Clear today, guilt-free",
    icon: Bed,
    classes: "border-sage/30 bg-cream/60 hover:bg-cream",
  },
];

export function ModeLauncher({
  energy,
  openTasks,
  onPlanDay,
  onTasksChanged,
}: {
  energy: EnergyLog | null;
  openTasks: Task[];
  onPlanDay: () => void;
  onTasksChanged: () => void;
}) {
  const [stuckOpen, setStuckOpen] = useState(false);
  const [lowOpen, setLowOpen] = useState(false);
  const [motivatedOpen, setMotivatedOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);

  function launch(mode: PlannerMode) {
    void api.logMode(mode);
    switch (mode) {
      case "plan":
        onPlanDay();
        break;
      case "stuck":
        setStuckOpen(true);
        break;
      case "low":
        setLowOpen(true);
        break;
      case "motivated":
        setMotivatedOpen(true);
        break;
      case "rest":
        setRestOpen(true);
        break;
    }
  }

  return (
    <>
      <section aria-label="What do you need right now?" className="calm-bg -mx-4 rounded-none px-4 py-1 sm:mx-0 sm:rounded-3xl sm:px-6 sm:py-4">
        <h2 className="sr-only">What do you need right now?</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {MODES.map(({ key, label, hint, icon: Icon, classes }, i) => (
            <motion.button
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => launch(key)}
              className={cn(
                "flex min-h-[44px] flex-col gap-1 rounded-2xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                classes
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <StuckSheet
        open={stuckOpen}
        onOpenChange={setStuckOpen}
        energy={energy}
        openTasks={openTasks}
      />
      <LowEnergySheet
        open={lowOpen}
        onOpenChange={setLowOpen}
        energy={energy}
        openTasks={openTasks}
        onTasksChanged={onTasksChanged}
      />
      <MotivatedSheet
        open={motivatedOpen}
        onOpenChange={setMotivatedOpen}
        openTasks={openTasks}
        onTasksChanged={onTasksChanged}
      />
      <RestSheet
        open={restOpen}
        onOpenChange={setRestOpen}
        openTasks={openTasks}
        onTasksChanged={onTasksChanged}
      />
    </>
  );
}

/* ———————————————————————————— I'm Stuck ———————————————————————————— */

const STUCK_REASONS: {
  key: "too-big" | "where-to-start" | "unclear";
  title: string;
  hint: string;
}[] = [
  {
    key: "too-big",
    title: "It feels too big",
    hint: "Shrink it until it's almost nothing",
  },
  {
    key: "where-to-start",
    title: "Don't know where to start",
    hint: "We'll find the first physical move",
  },
  {
    key: "unclear",
    title: "Instructions are unclear",
    hint: "We'll decode them together",
  },
];

function StuckSheet({
  open,
  onOpenChange,
  energy,
  openTasks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  energy: EnergyLog | null;
  openTasks: Task[];
}) {
  const [reason, setReason] = useState<"too-big" | "where-to-start" | "unclear" | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Task | null>(null);

  const candidates = openTasks;

  function reset() {
    setReason(null);
    setTaskId(null);
    setBreakdown(null);
  }

  return (
    <>
      <Sheet
        open={open && breakdown === null}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) reset();
        }}
      >
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-4xl bg-card px-5 pb-8 pt-6 sm:rounded-4xl sm:px-7"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-2xl leading-tight">
              What&apos;s making it hard?
            </SheetTitle>
            <SheetDescription className="leading-relaxed">
              Pick the closest one — there are no wrong doors here.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            <div className="grid gap-2.5">
              {STUCK_REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    setReason(r.key);
                    if (!taskId && candidates.length > 0) setTaskId(candidates[0].id);
                  }}
                  aria-pressed={reason === r.key}
                  className={cn(
                    "flex min-h-[44px] flex-col items-start rounded-2xl border p-4 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    reason === r.key
                      ? "border-lilac bg-lilac-soft/50"
                      : "border-border/80 bg-background hover:border-lilac/50"
                  )}
                >
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{r.hint}</span>
                </button>
              ))}
            </div>

            {reason && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  Which task? {candidates.length === 0 && " (nothing open right now — add one first)"}
                </p>
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {candidates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTaskId(t.id)}
                      aria-pressed={taskId === t.id}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                        taskId === t.id
                          ? "border-lilac bg-lilac-soft/40"
                          : "border-border/70 bg-background hover:border-lilac/40"
                      )}
                    >
                      <SpoonDots cost={t.spoonCost as SpoonCost} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {t.title}
                      </span>
                    </button>
                  ))}
                </div>
                <Button
                  disabled={!taskId}
                  onClick={() => {
                    const t = candidates.find((x) => x.id === taskId);
                    if (t) setBreakdown(t);
                  }}
                  className="h-12 w-full rounded-2xl bg-lilac-deep text-sm font-semibold text-white hover:bg-lilac-deep/90"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Break it into micro-steps
                </Button>
              </motion.div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <BreakdownSheet
        open={breakdown !== null}
        onOpenChange={(v) => {
          if (!v) {
            setBreakdown(null);
            onOpenChange(false);
            reset();
          }
        }}
        taskId={breakdown?.id}
        taskTitle={breakdown?.title}
        assignmentId={breakdown?.assignmentId ?? null}
        energy={(energy?.level ?? "medium") as "low" | "medium" | "high"}
        reason={reason ?? undefined}
        planForToday
      />
    </>
  );
}

/* ———————————————————————————— Low Energy ———————————————————————————— */

function LowEnergySheet({
  open,
  onOpenChange,
  energy,
  openTasks,
  onTasksChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  energy: EnergyLog | null;
  openTasks: Task[];
  onTasksChanged: () => void;
}) {
  const [busy, setBusy] = useState<"light" | "park" | null>(null);

  const lightest = useMemo(
    () =>
      [...openTasks]
        .filter((t) => t.spoonCost === 1)
        .sort((a, b) => (a.assignment?.dueDate ?? "9").localeCompare(b.assignment?.dueDate ?? "9"))[0] ??
      [...openTasks].sort((a, b) => a.spoonCost - b.spoonCost)[0],
    [openTasks]
  );

  const todaysHeavy = openTasks.filter((t) => t.spoonCost >= 2 && isToday(t));

  async function tryLight() {
    if (!lightest) return;
    setBusy("light");
    try {
      await api.updateTask(lightest.id, { plannedDate: new Date().toISOString() });
      toast("One light thing, front and center. That's the whole plan. 🌱");
      onTasksChanged();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't do that — try again?");
    } finally {
      setBusy(null);
    }
  }

  async function parkHeavy() {
    setBusy("park");
    try {
      for (const t of todaysHeavy) {
        await api.rolloverTask(t.id, "tomorrow");
      }
      toast(
        todaysHeavy.length > 0
          ? `${todaysHeavy.length} heavier task${todaysHeavy.length === 1 ? "" : "s"} parked for another day. Official deadlines stay exactly where they were.`
          : "Nothing heavy on today anyway — you're already light."
      );
      onTasksChanged();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't park those — try again?");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-4xl bg-card px-5 pb-8 pt-6 sm:rounded-4xl sm:px-7"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl leading-tight">
            Low energy is information, not failure
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {energy
              ? "Here's the lightest possible way to keep a thread of momentum."
              : "We'll go gentle either way."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {lightest ? (
            <div className="rounded-2xl border border-rose/30 bg-rose-soft/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-deep/80">
                The lightest thing on your plate
              </p>
              <p className="mt-1.5 font-display text-lg font-semibold leading-snug">
                {lightest.title}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <SpoonDots cost={lightest.spoonCost as SpoonCost} />
                <span className="text-xs text-muted-foreground">
                  {lightest.spoonCost === 1 ? "one spoon — that's allowed to be enough" : "as light as it gets right now"}
                </span>
              </div>
              <Button
                onClick={tryLight}
                disabled={busy !== null}
                className="mt-4 h-11 w-full rounded-2xl bg-rose-deep text-sm font-semibold text-white hover:bg-rose-deep/90"
              >
                {busy === "light" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try just this one"}
              </Button>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nothing open at all — the lightest plan is already yours. 🌤️
            </p>
          )}

          {todaysHeavy.length > 0 && (
            <button
              onClick={parkHeavy}
              disabled={busy !== null}
              className="flex w-full flex-col items-start rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:border-rose/40 disabled:opacity-60"
            >
              <span className="text-sm font-semibold">
                {busy === "park" ? "Parking…" : `Park ${todaysHeavy.length} heavier task${todaysHeavy.length === 1 ? "" : "s"} for another day`}
              </span>
              <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                They&apos;ll roll to tomorrow, gently. Official due dates stay fixed — nothing is lost.
              </span>
            </button>
          )}

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            P.S. Doing only the tiny thing still counts as showing up today.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ———————————————————————————— Motivated ———————————————————————————— */

const LOADS: { key: "little" | "session" | "full"; title: string; hint: string; spoons: number }[] = [
  { key: "little", title: "A little more", hint: "+1 task", spoons: 3 },
  { key: "session", title: "A solid session", hint: "+2–3 tasks", spoons: 5 },
  { key: "full", title: "Full send (gently)", hint: "up to a high-spoon day", spoons: 7 },
];

function MotivatedSheet({
  open,
  onOpenChange,
  openTasks,
  onTasksChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  openTasks: Task[];
  onTasksChanged: () => void;
}) {
  const [picked, setPicked] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const available = useMemo(
    () =>
      openTasks
        .filter((t) => !isToday(t))
        .sort((a, b) =>
          (a.assignment?.dueDate ?? "9").localeCompare(b.assignment?.dueDate ?? "9")
        ),
    [openTasks]
  );

  function chooseLoad(spoons: number) {
    const chosen: Task[] = [];
    let used = 0;
    for (const t of available) {
      if (used + t.spoonCost > spoons) continue;
      chosen.push(t);
      used += t.spoonCost;
      if (chosen.length >= 4) break;
    }
    setPicked(chosen);
  }

  async function addPicked() {
    setLoading(true);
    try {
      for (const t of picked) {
        await api.updateTask(t.id, { plannedDate: new Date().toISOString() });
      }
      toast.success(
        picked.length > 0
          ? `Riding the wave — ${picked.length} task${picked.length === 1 ? "" : "s"} added to today. Momentum, not pressure. ⚡`
          : "Nothing more to add — your plate is already full in a good way."
      );
      onTasksChanged();
      onOpenChange(false);
      setPicked([]);
    } catch {
      toast.error("Couldn't add those — try again?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setPicked([]); }}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-4xl bg-card px-5 pb-8 pt-6 sm:rounded-4xl sm:px-7"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl leading-tight">
            Love the energy ⚡ — how much do you want?
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            You set the size. We&apos;ll never sneak extra work onto your plate.
          </SheetDescription>
        </SheetHeader>

        {picked.length === 0 ? (
          <div className="mt-5 grid gap-2.5">
            {LOADS.map((l) => (
              <button
                key={l.key}
                onClick={() => chooseLoad(l.spoons)}
                className="flex min-h-[44px] items-center justify-between rounded-2xl border border-honey/40 bg-honey-soft/40 p-4 text-left transition hover:bg-honey-soft/70"
              >
                <span>
                  <span className="block text-sm font-semibold">{l.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{l.hint}</span>
                </span>
                <span className="num text-sm font-semibold text-honey-deep">≤{l.spoons} 🥄</span>
              </button>
            ))}
            {available.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Everything you have is already planned for today — create more in
                Courses if you want more to chew on.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Our suggestions — untick anything that feels like too much:
            </p>
            <ul className="space-y-2.5">
              {picked.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-honey/40 bg-honey-soft/25 p-3.5"
                >
                  <SpoonDots cost={t.spoonCost as SpoonCost} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                className="h-11 rounded-2xl px-5 text-sm text-muted-foreground"
                onClick={() => setPicked([])}
              >
                Choose differently
              </Button>
              <Button
                onClick={addPicked}
                disabled={loading}
                className="h-11 rounded-2xl bg-honey-deep px-6 text-sm font-semibold text-white hover:bg-honey-deep/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${picked.length} to today`}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ———————————————————————————— Rest ———————————————————————————— */

function RestSheet({
  open,
  onOpenChange,
  openTasks,
  onTasksChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  openTasks: Task[];
  onTasksChanged: () => void;
}) {
  const todaysTasks = openTasks.filter(isToday);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function takeRest() {
    setBusy(true);
    try {
      for (const t of todaysTasks) {
        await api.rolloverTask(t.id, "tomorrow");
      }
      setDone(true);
      onTasksChanged();
    } catch {
      toast.error("Couldn't clear today — try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDone(false);
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-4xl bg-card px-5 pb-8 pt-6 sm:rounded-4xl sm:px-7"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl leading-tight">
            {done ? "Today is officially soft 🌙" : "Rest is a plan too"}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {done
              ? `Your ${todaysTasks.length} task${todaysTasks.length === 1 ? "" : "s"} moved to tomorrow, gently. Official deadlines stay fixed — nothing is lost, nothing is late because you rested.`
              : "We'll clear today's plan and move it to tomorrow. Deadlines stay exactly where they are. You're allowed to do this."}
          </SheetDescription>
        </SheetHeader>

        {todaysTasks.length > 0 && !done && (
          <ul className="mt-4 space-y-2">
            {todaysTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-2.5"
              >
                <Bed className="h-3.5 w-3.5 text-sage-deep" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <span className="text-xs text-muted-foreground">→ tomorrow</span>
              </li>
            ))}
          </ul>
        )}

        {!done && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="h-11 rounded-2xl px-5 text-sm text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Actually, I'm okay
            </Button>
            <Button
              onClick={takeRest}
              disabled={busy}
              className="h-11 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes — clear today"}
            </Button>
          </div>
        )}

        {done && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 rounded-2xl bg-sage-soft/50 p-4 text-sm leading-relaxed text-sage-deep"
          >
            Rest counts. Your streak cares about consistency, not intensity — and
            tomorrow-you will meet a calmer plate. 🌿
          </motion.p>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ——— helpers ——— */

function isToday(t: Task): boolean {
  if (!t.plannedDate) return false;
  const d = new Date(t.plannedDate);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
