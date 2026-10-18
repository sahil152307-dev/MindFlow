"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarHeart,
  Check,
  ChevronDown,
  Flame,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useMindFlow } from "@/lib/store";
import { friendlyDate, greetingFor } from "@/lib/format";
import type { DayPlan, EnergyLog, SpoonCost, Task } from "@/lib/types";
import { CAPACITY } from "@/lib/types";
import { SpoonCheckIn } from "@/components/app/spoon-checkin";
import { TaskCard } from "@/components/app/task-card";
import { SuggestionCard } from "@/components/app/suggestion-card";
import { BreakdownSheet } from "@/components/app/breakdown-sheet";
import { ModeLauncher } from "@/components/app/mode-launcher";
import { NowCard } from "@/components/app/now-sheet";
import { GentleReadCard } from "@/components/app/gentle-read-card";
import { ProofButton } from "@/components/app/proof-button";
import { SpoonDots, SpoonGlyph } from "@/components/app/spoon-ui";

const emptySubscribe = () => () => {};
/** false during SSR/hydration, true on the client — gates time-based text. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function TodayView() {
  const user = useMindFlow((s) => s.user);
  const patchUser = useMindFlow((s) => s.patchUser);
  const mounted = useMounted();

  const [energy, setEnergy] = useState<EnergyLog | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [wins, setWins] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [backlog, setBacklog] = useState<Task[]>([]);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [planBusy, setPlanBusy] = useState(false);
  const [winsOpen, setWinsOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [quickSpoons, setQuickSpoons] = useState<SpoonCost>(1);
  const [adding, setAdding] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    taskId?: string;
    title?: string;
    assignmentId?: string | null;
  } | null>(null);

  const firstName = user?.name.split(" ")[0] ?? "friend";
  const greeting = mounted ? greetingFor(new Date().getHours()) : "Hello";

  const refresh = useCallback(async () => {
    const [t, w, o, b] = await Promise.all([
      api.listTasks("today"),
      api.listTasks("done-today"),
      api.listTasks("overdue"),
      api.listTasks("backlog"),
    ]);
    setTodayTasks(t.tasks);
    setWins(w.tasks);
    setOverdue(o.tasks);
    setBacklog(b.tasks);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [e, t, w, o, b] = await Promise.all([
          api.getEnergy(),
          api.listTasks("today"),
          api.listTasks("done-today"),
          api.listTasks("overdue"),
          api.listTasks("backlog"),
        ]);
        if (!alive) return;
        setEnergy(e.today);
        setTodayTasks(t.tasks);
        setWins(w.tasks);
        setOverdue(o.tasks);
        setBacklog(b.tasks);
      } catch {
        if (alive) toast("We couldn't load today. A refresh usually helps.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
     
  }, []);

  /* ——— energy → plan flow (PRD: check-in dictates scheduling) ——— */
  const suggestPlan = useCallback(
    async (level: EnergyLog["level"]) => {
      setPlanBusy(true);
      try {
        const { plan: p } = await api.generatePlan(level);
        if (p.suggestions.length === 0) {
          // Empty basket — say it kindly, keep the CTA available
          toast(p.summary);
          setPlan(null);
        } else {
          setPlan(p);
        }
      } catch {
        toast("The planner hiccuped. Try again in a moment.");
      } finally {
        setPlanBusy(false);
      }
    },
    []
  );

  const onChecked = useCallback(
    (log: EnergyLog, changed: boolean) => {
      setEnergy(log);
      if (!changed) return;
      if (todayTasks.length === 0) {
        void suggestPlan(log.level);
      } else {
        toast("Noted. Your plan stays as kind as ever.");
      }
    },
    [todayTasks.length, suggestPlan]
  );

  const acceptSuggestion = useCallback(
    (t: Task) => {
      const wasLast = plan?.suggestions.length === 1;
      setPlan((p) =>
        p
          ? {
              ...p,
              suggestions: p.suggestions.filter((s) => s.task.id !== t.id),
            }
          : p
      );
      if (wasLast) setPlan(null);
      setTodayTasks((list) => [...list, t]);
      if (wasLast) {
        toast("Plan set for today. Rearrange or skip anything — your call.");
      }
    },
    [plan]
  );

  const skipSuggestion = useCallback(
    (t: Task) => {
      const wasLast = plan?.suggestions.length === 1;
      setPlan((p) =>
        p
          ? {
              ...p,
              suggestions: p.suggestions.filter((s) => s.task.id !== t.id),
            }
          : p
      );
      if (wasLast) setPlan(null);
    },
    [plan]
  );

  const acceptAll = useCallback(async () => {
    const remaining = plan?.suggestions ?? [];
    for (const s of remaining) {
      try {
        await api.updateTask(s.task.id, { plannedDate: new Date().toISOString() });
        setTodayTasks((list) => [...list, { ...s.task, plannedDate: new Date().toISOString() }]);
      } catch {
        /* keep going — partial is fine */
      }
    }
    setPlan(null);
    toast("Whole plan added. One thing at a time is still the whole plan. 🌿");
  }, [plan]);

  /* ——— today list actions ——— */
  const onComplete = useCallback(
    (t: Task, completion: { message: string; tokensAwarded: number; streakDays: number }, wallet: { coins: number; tokens: number; streakDays: number; longestStreak: number } | null) => {
      setTodayTasks((list) => list.filter((x) => x.id !== t.id));
      setWins((list) => [t, ...list]);
      setWinsOpen(true);
      if (wallet) patchUser(wallet);
      if (completion.tokensAwarded > 0) {
        toast.success(`🌿 ${completion.message}`, {
          description: `+${completion.tokensAwarded} consistency tokens — that's the weekly flow bonus!`,
        });
      } else {
        toast.success(`✓ ${completion.message}`, {
          description: "Done is done — perfectly imperfect counts.",
        });
      }
      void refresh();
    },
    [patchUser, refresh]
  );

  const onTaskChange = useCallback(
    (t: Task) => {
      if (t.status === "skipped") {
        setTodayTasks((list) => list.filter((x) => x.id !== t.id));
        setOverdue((list) => list.filter((x) => x.id !== t.id));
      } else if (t.plannedDate && new Date(t.plannedDate) > new Date()) {
        // rolled forward → leaves today
        setTodayTasks((list) => list.filter((x) => x.id !== t.id));
        setOverdue((list) => list.filter((x) => x.id !== t.id));
      } else {
        setTodayTasks((list) => list.map((x) => (x.id === t.id ? t : x)));
      }
    },
    []
  );

  const moveTask = useCallback(
    async (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= todayTasks.length) return;
      const next = [...todayTasks];
      [next[index], next[j]] = [next[j], next[index]];
      setTodayTasks(next);
      try {
        await Promise.all([
          api.updateTask(next[index].id, { position: index }),
          api.updateTask(next[j].id, { position: j }),
        ]);
      } catch {
        /* order is cosmetic; no need to alarm anyone */
      }
    },
    [todayTasks]
  );

  async function quickAddTask() {
    const title = quickAdd.trim();
    if (!title) return;
    setAdding(true);
    try {
      const { task } = await api.createTask({
        title,
        spoonCost: quickSpoons,
        plannedDate: new Date().toISOString(),
      });
      setTodayTasks((list) => [...list, task]);
      setQuickAdd("");
      toast("Added to today. Tiny is a strategy. 🌱");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that.");
    } finally {
      setAdding(false);
    }
  }

  const openToday = useMemo(() => todayTasks, [todayTasks]);
  /* spoons currently planned vs today's capacity (dashboard chip) */
  const plannedSpoons = useMemo(
    () =>
      openToday
        .filter((t) => t.status === "todo" || t.status === "doing")
        .reduce((s, t) => s + t.spoonCost, 0),
    [openToday]
  );
  const allOpenTasks = useMemo(
    () => [...todayTasks, ...overdue, ...backlog],
    [todayTasks, overdue, backlog]
  );
  const showPlanCta =
    !loading &&
    energy !== null &&
    openToday.length === 0 &&
    plan === null &&
    overdue.length === 0;

  /* Scroll to a task card and give it a soft sage glow */
  const focusTask = useCallback((id: string) => {
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("now-pulse");
    window.setTimeout(() => el.classList.remove("now-pulse"), 3400);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading today">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ——— greeting + personalized dashboard strip ——— */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight sm:text-3xl">
            {greeting}, {firstName}{" "}
            <span aria-hidden className="text-sage">
              🌿
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mounted ? friendlyDate(new Date()) : "Today"} ·{" "}
            {energy
              ? energy.level === "low"
                ? "low-spoon day — tiny is the plan"
                : energy.level === "medium"
                  ? "medium energy — a balanced bite"
                  : "high energy — bigger gentle bites"
              : "check in below to shape today"}
          </p>
          {/* dashboard chips: a soft at-a-glance of the day */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/30 bg-sage-soft/40 px-3 py-1 text-xs font-semibold text-sage-deep">
              <Flame className="h-3.5 w-3.5" aria-hidden />
              <span className="num">{user?.streakDays ?? 0}</span>-day flow
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-honey/40 bg-honey-soft/40 px-3 py-1 text-xs font-semibold text-honey-deep">
              <ListTodo className="h-3.5 w-3.5" aria-hidden />
              <span className="num">{openToday.filter((t) => t.status !== "done").length}</span>{" "}
              open today
            </span>
            {energy && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  plannedSpoons > CAPACITY[energy.level]
                    ? "border-peach/40 bg-peach-soft/40 text-peach-deep"
                    : "border-lilac/40 bg-lilac-soft/40 text-lilac-deep"
                )}
              >
                <SpoonGlyph className="h-3.5 w-3.5" aria-hidden />
                <span className="num">
                  {plannedSpoons}/{CAPACITY[energy.level]}
                </span>{" "}
                spoons planned
                {plannedSpoons > CAPACITY[energy.level] && (
                  <span className="font-normal opacity-80">— pick what matters</span>
                )}
              </span>
            )}
          </div>
        </div>
        {wins.length > 0 && (
          <button
            onClick={() => setWinsOpen((v) => !v)}
            aria-expanded={winsOpen}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-sage-soft px-4 py-2 text-sm font-semibold text-sage-deep shadow-soft transition hover:bg-sage-soft/70"
          >
            🎉 {wins.length} win{wins.length === 1 ? "" : "s"} today
            <ChevronDown className={cn("h-4 w-4 transition-transform", winsOpen && "rotate-180")} />
          </button>
        )}
      </header>

      {/* ——— mode launcher ——— */}
      <ModeLauncher
        energy={energy}
        openTasks={allOpenTasks}
        onPlanDay={() => {
          if (!energy) {
            toast("Check in with your spoons first — then we'll shape the day.");
            document
              .getElementById("checkin-heading")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          if (plan && plan.suggestions.length > 0) {
            toast("Your plan is right here — accept, edit or skip away.");
            return;
          }
          void suggestPlan(energy.level);
        }}
        onTasksChanged={() => void refresh()}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ——— left column ——— */}
        <div className="space-y-6 lg:col-span-2">
          <SpoonCheckIn current={energy} onChecked={onChecked} />

          <NowCard
            openCount={allOpenTasks.length}
            onFocusTask={focusTask}
            onTasksChanged={() => void refresh()}
            onBreakdown={(t) =>
              setBreakdown({
                taskId: t.id,
                title: t.title,
                assignmentId: t.assignmentId,
              })
            }
          />

          <GentleReadCard />

          {showPlanCta && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-lilac/40 bg-lilac-soft/20 p-5 shadow-soft"
            >
              <h2 className="font-display text-lg font-semibold">Want a plan that fits?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                We&apos;ll pick a few tasks that match your spoons. Accept, edit or
                skip each one — always your call.
              </p>
              <Button
                onClick={() => energy && suggestPlan(energy.level)}
                disabled={planBusy}
                className="mt-4 h-11 w-full rounded-2xl bg-lilac-deep text-sm font-semibold text-white hover:bg-lilac-deep/90"
              >
                {planBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Suggest my day
                  </>
                )}
              </Button>
            </motion.section>
          )}

          {/* ——— taking its time (anti-shame rollover) ——— */}
          {overdue.length > 0 && (
            <section
              aria-labelledby="gentle-section"
              className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-rose" aria-hidden />
                <h2 id="gentle-section" className="font-display text-lg font-semibold">
                  Taking its time
                </h2>
                <span className="rounded-full bg-rose-soft px-2 py-0.5 text-xs font-semibold text-rose-deep">
                  {overdue.length}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                These planned days have passed — there&apos;s no red here, only
                soft options.
              </p>
              <ul className="mt-4 space-y-3">
                {overdue.map((t) => (
                  <li
                    key={t.id}
                    data-task-id={t.id}
                    className="rounded-2xl border border-border/60 bg-background/60 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{t.title}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <SpoonDots cost={t.spoonCost as SpoonCost} />
                          {t.rolledCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              rolled {t.rolledCount}×, no guilt
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-9 rounded-full bg-lilac-deep px-3.5 text-xs font-semibold text-white hover:bg-lilac-deep/90"
                        onClick={() =>
                          setBreakdown({
                            taskId: t.id,
                            title: t.title,
                            assignmentId: t.assignmentId,
                          })
                        }
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Break it into smaller steps
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-full border-border px-3.5 text-xs font-medium hover:border-sage/50 hover:bg-sage-soft/40"
                        onClick={async () => {
                          try {
                            const res = await api.rolloverTask(t.id);
                            toast(res.message);
                            onTaskChange(res.task);
                          } catch {
                            toast.error("Couldn't roll it — try again?");
                          }
                        }}
                      >
                        <CalendarHeart className="mr-1.5 h-3.5 w-3.5" />
                        Roll to tomorrow
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 rounded-full px-3.5 text-xs font-medium text-muted-foreground"
                        onClick={async () => {
                          try {
                            await api.updateTask(t.id, { status: "skipped" });
                            onTaskChange({ ...t, status: "skipped" });
                            toast("Let go, guilt-free. Space cleared is progress too.");
                          } catch {
                            toast.error("Couldn't do that — try again?");
                          }
                        }}
                      >
                        Let it go
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ——— right column ——— */}
        <div className="space-y-6 lg:col-span-3">
          {/* plan suggestions */}
          <AnimatePresence>
            {plan && plan.suggestions.length > 0 && (
              <motion.section
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                aria-labelledby="suggestions-heading"
                className="rounded-3xl border border-lilac/40 bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 id="suggestions-heading" className="font-display text-xl font-semibold">
                      A plan shaped like your spoons
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {plan.summary}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="h-9 rounded-full bg-lilac-deep px-4 text-xs font-semibold text-white hover:bg-lilac-deep/90"
                  >
                    Add all {plan.suggestions.length}
                  </Button>
                </div>
                <ul className="mt-4 space-y-3">
                  <AnimatePresence>
                    {plan.suggestions.map((s) => (
                      <SuggestionCard
                        key={s.task.id}
                        task={s.task}
                        reason={s.reason}
                        reasons={s.reasons}
                        onAccepted={acceptSuggestion}
                        onSkipped={skipSuggestion}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            )}
          </AnimatePresence>

          {/* today's plan */}
          <section
            aria-labelledby="today-heading"
            className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="today-heading" className="font-display text-xl font-semibold">
                Today&apos;s plan
              </h2>
              <span className="num text-sm font-medium text-muted-foreground">
                {openToday.length} task{openToday.length === 1 ? "" : "s"}
              </span>
            </div>

            {openToday.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/50 p-6 text-center">
                <SpoonGlyph className="mx-auto h-6 w-6 text-sage/60" />
                <p className="mt-2 text-sm font-medium">Nothing planned for today.</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Check in with your spoons and we&apos;ll shape a gentle plan —
                  or add one tiny thing below.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                <AnimatePresence>
                  {openToday.map((t, i) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onChange={onTaskChange}
                      onComplete={onComplete}
                      onMove={(dir) => moveTask(i, dir)}
                      onBreakdown={() =>
                        setBreakdown({
                          taskId: t.id,
                          title: t.title,
                          assignmentId: t.assignmentId,
                        })
                      }
                      showMove
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {/* quick add */}
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                quickAddTask();
              }}
            >
              <div className="relative flex-1">
                <input
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  placeholder="Add one tiny thing…"
                  aria-label="Add a tiny task to today"
                  maxLength={160}
                  className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-ring/40"
                />
                <Plus className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <div
                  className="flex items-center gap-0.5 rounded-2xl border border-border bg-background px-2"
                  role="radiogroup"
                  aria-label="Spoons for the new task"
                >
                  {([1, 2, 3] as SpoonCost[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={quickSpoons === s}
                      onClick={() => setQuickSpoons(s)}
                      className={cn(
                        "flex h-10 w-9 items-center justify-center rounded-xl transition",
                        quickSpoons === s
                          ? "bg-honey-soft text-honey-deep"
                          : "text-muted-foreground/50 hover:text-honey-deep"
                      )}
                    >
                      <SpoonGlyph className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <Button
                  type="submit"
                  disabled={adding || !quickAdd.trim()}
                  className="h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </form>
          </section>

          {/* today's wins */}
          <AnimatePresence>
            {wins.length > 0 && winsOpen && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border border-sage/30 bg-sage-soft/25 p-5 shadow-soft"
              >
                <h2 className="font-display text-lg font-semibold text-sage-deep">
                  Today&apos;s wins 🎉
                </h2>
                <ul className="mt-3 space-y-2">
                  {wins.map((w) => (
                    <li
                      key={w.id}
                      className="flex flex-wrap items-center gap-2.5 rounded-xl bg-card/70 px-3.5 py-2.5"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-sage-deep">
                        {w.title}
                      </span>
                      <SpoonDots cost={w.spoonCost as SpoonCost} />
                      {w.hasProof ? (
                        <span
                          title="Proof earned +10 Spoon Coins"
                          className="num inline-flex items-center gap-1 rounded-full bg-honey-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-honey-deep"
                        >
                          +10 🪙
                        </span>
                      ) : (
                        <ProofButton
                          task={w}
                          onUploaded={(t) =>
                            setWins((list) =>
                              list.map((x) => (x.id === t.id ? { ...x, hasProof: true } : x))
                            )
                          }
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ——— AI micro-sequencer ——— */}
      <BreakdownSheet
        open={breakdown !== null}
        onOpenChange={(v) => !v && setBreakdown(null)}
        taskId={breakdown?.taskId}
        taskTitle={breakdown?.title}
        assignmentId={breakdown?.assignmentId ?? null}
        energy={(energy?.level ?? "medium") as "low" | "medium" | "high"}
        planForToday
        onStepsAdded={() => void refresh()}
      />
    </div>
  );
}
