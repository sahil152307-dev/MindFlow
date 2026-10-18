"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  Coins,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
  WandSparkles,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { dueLabel } from "@/lib/format";
import type { SpoonCost, Task } from "@/lib/types";
import { SpoonDots } from "@/components/app/spoon-ui";

const COURSE_DOT: Record<string, string> = {
  sage: "bg-sage",
  honey: "bg-honey",
  rose: "bg-rose",
  lilac: "bg-lilac",
  peach: "bg-honey",
};

export function TaskCard({
  task,
  onChange,
  onComplete,
  onMove,
  onBreakdown,
  showMove = false,
}: {
  task: Task;
  onChange: (t: Task) => void;
  onBreakdown?: () => void;
  onComplete: (
    t: Task,
    completion: { message: string; tokensAwarded: number; streakDays: number; weekProgress: number },
    wallet: { coins: number; tokens: number; streakDays: number; longestStreak: number } | null
  ) => void;
  onMove?: (dir: -1 | 1) => void;
  onBreakdown?: () => void;
  showMove?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({ title: task.title, notes: task.notes ?? "", spoonCost: task.spoonCost });

  const done = task.status === "done";
  const due = task.assignment ? dueLabel(task.assignment.dueDate) : null;

  async function complete() {
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await api.completeTask(task.id);
      onComplete(
        { ...task, status: "done", completedAt: new Date().toISOString() },
        res.completion,
        res.wallet
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!draft.title.trim()) {
      toast("Give it a name — even a silly one works.");
      return;
    }
    setBusy(true);
    try {
      const { task: updated } = await api.updateTask(task.id, {
        title: draft.title.trim(),
        notes: draft.notes.trim() || null,
        spoonCost: draft.spoonCost as SpoonCost,
      });
      onChange({ ...task, ...updated });
      setEditOpen(false);
      toast("Updated. Small edits are allowed here.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<void>, done: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      done();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      layout
      data-task-id={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className={cn(
        "group rounded-2xl border bg-card p-3.5 shadow-soft transition-colors sm:p-4",
        done ? "border-sage/30 bg-sage-soft/30" : "border-border/70 hover:border-sage/40"
      )}
    >
      <div className="flex items-start gap-3">
        {/* gentle complete circle */}
        <button
          onClick={complete}
          disabled={busy || done}
          aria-label={done ? "Completed" : `Mark "${task.title}" as done`}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
            done
              ? "border-sage bg-sage text-white"
              : "border-muted-foreground/30 text-transparent hover:border-sage hover:bg-sage-soft/50 hover:text-sage-deep"
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              className={cn(
                "text-[0.9375rem] font-medium leading-snug text-foreground",
                done && "text-muted-foreground line-through decoration-sage/50"
              )}
            >
              {task.title}
            </h3>
            {task.isMicro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-lilac-soft px-2 py-0.5 text-[0.625rem] font-semibold text-lilac-deep">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                AI step
              </span>
            )}
            {task.hasProof && (
              <span
                title="Proof earned Spoon Coins"
                className="inline-flex items-center gap-0.5 rounded-full bg-honey-soft px-1.5 py-0.5 text-[0.625rem] font-semibold text-honey-deep"
              >
                <Coins className="h-2.5 w-2.5" aria-hidden />+10
              </span>
            )}
          </div>

          {task.notes && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {task.notes}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <SpoonDots cost={task.spoonCost as SpoonCost} />
            {task.assignment && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                {task.assignment.course && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 rounded-full",
                      COURSE_DOT[task.assignment.course.color] ?? "bg-sage"
                    )}
                  />
                )}
                <span className="max-w-[16rem] truncate">{task.assignment.title}</span>
              </span>
            )}
            {due && !done && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  due.tone === "honey" && "text-honey-deep",
                  due.tone === "peach" && "text-peach-deep",
                  due.tone === "muted" && "text-muted-foreground",
                  due.tone === "sage" && "text-sage-deep"
                )}
              >
                <CalendarClock className="h-3 w-3" aria-hidden />
                {due.text}
              </span>
            )}
            {task.rolledCount > 0 && !done && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-deep/80" title="Rolled forward gently — never punished">
                <Wind className="h-3 w-3" aria-hidden />
                rolled {task.rolledCount}×, no guilt
              </span>
            )}
          </div>
        </div>

        {/* actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${task.title}`}
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl">
            <DropdownMenuItem className="gap-2 rounded-xl" onClick={() => {
              setDraft({ title: task.title, notes: task.notes ?? "", spoonCost: task.spoonCost });
              setEditOpen(true);
            }}>
              <Pencil className="h-4 w-4" /> Edit task
            </DropdownMenuItem>
            {showMove && onMove && (
              <>
                <DropdownMenuItem
                  className="gap-2 rounded-xl"
                  onClick={() => onMove(-1)}
                >
                  <ArrowUp className="h-4 w-4" /> Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 rounded-xl"
                  onClick={() => onMove(1)}
                >
                  <ArrowDown className="h-4 w-4" /> Move down
                </DropdownMenuItem>
              </>
            )}
            {onBreakdown && (
              <DropdownMenuItem
                className="gap-2 rounded-xl focus:text-lilac-deep"
                onClick={onBreakdown}
              >
                <WandSparkles className="h-4 w-4" /> Break into micro-steps
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 rounded-xl focus:text-peach-deep"
              onClick={() =>
                act(
                  async () => {
                    const res = await api.rolloverTask(task.id);
                    toast(res.message);
                    onChange(res.task);
                  },
                  () => undefined
                )
              }
            >
              <CalendarClock className="h-4 w-4" /> Roll to tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 rounded-xl focus:text-muted-foreground"
              onClick={() =>
                act(
                  async () => {
                    await api.updateTask(task.id, { status: "skipped" });
                    onChange({ ...task, status: "skipped" });
                    toast("Let go, guilt-free. It can come back whenever.");
                  },
                  () => undefined
                )
              }
            >
              <Wind className="h-4 w-4" /> Let it go
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 rounded-xl focus:text-rose-deep"
              onClick={() =>
                act(
                  async () => {
                    await api.deleteTask(task.id);
                    onChange({ ...task, status: "skipped" });
                    toast("Removed. Sometimes clearing space is the kindest task.");
                  },
                  () => undefined
                )
              }
            >
              <Trash2 className="h-4 w-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ——— edit dialog ——— */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="task-title" className="text-xs font-semibold text-muted-foreground">
                What needs doing?
              </label>
              <input
                id="task-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-notes" className="text-xs font-semibold text-muted-foreground">
                A kind note to future-you (optional)
              </label>
              <Textarea
                id="task-notes"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="min-h-[70px] rounded-xl"
                maxLength={400}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                How many spoons?
              </span>
              <div className="flex gap-2">
                {([1, 2, 3] as SpoonCost[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setDraft({ ...draft, spoonCost: s })}
                    aria-pressed={draft.spoonCost === s}
                    className={cn(
                      "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      draft.spoonCost === s
                        ? "border-honey bg-honey-soft/60 text-honey-deep"
                        : "border-border bg-background hover:border-honey/50"
                    )}
                  >
                    <SpoonDots cost={s} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={busy}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}
