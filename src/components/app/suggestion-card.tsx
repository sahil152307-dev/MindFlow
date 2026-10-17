"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { SpoonCost, Task } from "@/lib/types";
import { SpoonDots } from "@/components/app/spoon-ui";
import { dueLabel } from "@/lib/format";

/**
 * A suggested task with the PRD's accept / edit / skip controls.
 * Skipping is always okay — no task is ever punished for it.
 */
export function SuggestionCard({
  task,
  reason,
  onAccepted,
  onSkipped,
}: {
  task: Task;
  reason: string;
  onAccepted: (t: Task) => void;
  onSkipped: (t: Task) => void;
}) {
  const [busy, setBusy] = useState<"accept" | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const due = task.assignment ? dueLabel(task.assignment.dueDate) : null;

  async function accept() {
    setBusy("accept");
    try {
      if (editing && title.trim() && title.trim() !== task.title) {
        await api.updateTask(task.id, { title: title.trim() });
      }
      await api.updateTask(task.id, { plannedDate: new Date().toISOString() });
      onAccepted({ ...task, title: title.trim() || task.title, plannedDate: new Date().toISOString() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
      className="rounded-2xl border border-lilac/40 bg-lilac-soft/25 p-3.5 sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && accept()}
              onBlur={() => setEditing(false)}
              aria-label="Edit suggested task title"
              className="w-full rounded-lg border border-lilac/50 bg-card px-2.5 py-1.5 text-[0.9375rem] font-medium outline-none focus:ring-2 focus:ring-ring/40"
              maxLength={160}
            />
          ) : (
            <h3 className="text-[0.9375rem] font-medium leading-snug text-foreground">
              {title}
            </h3>
          )}
          <p className="mt-1 text-xs italic leading-relaxed text-lilac-deep/80">
            {reason}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <SpoonDots cost={task.spoonCost as SpoonCost} />
            {due && <span className="text-xs text-muted-foreground">{due.text}</span>}
          </div>
        </div>
        <SpoonDots cost={task.spoonCost as SpoonCost} className="hidden sm:inline-flex" />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          onClick={accept}
          disabled={busy !== null}
          className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {busy === "accept" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5" /> {editing ? "Save & add" : "Add to today"}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSkipped(task)}
          className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Skip
        </Button>
      </div>
    </motion.li>
  );
}
