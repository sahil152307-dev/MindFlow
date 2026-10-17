"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarRange,
  Check,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { dueLabel, shortDate } from "@/lib/format";
import type { Assignment, Course, CourseColor, SpoonCost, Task } from "@/lib/types";
import { SectionHeading } from "@/components/app/section-heading";
import { SpoonDots, SpoonGlyph } from "@/components/app/spoon-ui";
import { AssignmentDialog, CourseDialog } from "@/components/app/assignment-dialogs";
import { BreakdownSheet } from "@/components/app/breakdown-sheet";
import { WandSparkles } from "lucide-react";

const COURSE_BG: Record<CourseColor, string> = {
  sage: "bg-sage-soft/50 border-sage/30",
  honey: "bg-honey-soft/50 border-honey/40",
  rose: "bg-rose-soft/50 border-rose/40",
  lilac: "bg-lilac-soft/50 border-lilac/40",
  peach: "bg-peach-soft/50 border-peach/50",
};

const COURSE_DOT: Record<CourseColor, string> = {
  sage: "bg-sage",
  honey: "bg-honey",
  rose: "bg-rose",
  lilac: "bg-lilac",
  peach: "bg-honey",
};

export function CoursesView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [courseDialog, setCourseDialog] = useState<{ open: boolean; editing?: Course | null }>({ open: false });
  const [asgDialog, setAsgDialog] = useState<{ open: boolean; editing?: Assignment | null }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "course" | "assignment"; id: string; name: string } | null
  >(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [assignmentTasks, setAssignmentTasks] = useState<Record<string, Task[]>>({});
  const [taskDrafts, setTaskDrafts] = useState<Record<string, { title: string; spoons: SpoonCost }>>({});
  const [breakdown, setBreakdown] = useState<{
    taskId?: string;
    title?: string;
    assignmentId?: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([api.listCourses(), api.listAssignments()]);
      setCourses(c.courses);
      setAssignments(a.assignments);
    } catch {
      toast("Couldn't load your courses. A refresh usually helps.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleExpand = useCallback(
    async (a: Assignment) => {
      const willOpen = !expanded[a.id];
      setExpanded((m) => ({ ...m, [a.id]: willOpen }));
      if (willOpen && !assignmentTasks[a.id]) {
        try {
          const { tasks } = await api.listTasks("all", a.id);
          setAssignmentTasks((m) => ({ ...m, [a.id]: tasks }));
        } catch {
          toast("Couldn't load the steps. Try again?");
        }
      }
    },
    [expanded, assignmentTasks]
  );

  async function addTinyTask(a: Assignment) {
    const draft = taskDrafts[a.id];
    if (!draft?.title.trim()) return;
    try {
      const { task } = await api.createTask({
        title: draft.title.trim(),
        spoonCost: draft.spoons,
        assignmentId: a.id,
      });
      setAssignmentTasks((m) => ({ ...m, [a.id]: [...(m[a.id] ?? []), task] }));
      setTaskDrafts((m) => ({ ...m, [a.id]: { title: "", spoons: 1 } }));
      setAssignments((list) =>
        list.map((x) => (x.id === a.id ? { ...x, taskCount: (x.taskCount ?? 0) + 1 } : x))
      );
      toast("Tiny step added. That's how mountains move. 🌱");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that.");
    }
  }

  async function completeStep(a: Assignment, t: Task) {
    try {
      const res = await api.completeTask(t.id);
      setAssignmentTasks((m) => ({
        ...m,
        [a.id]: (m[a.id] ?? []).map((x) => (x.id === t.id ? { ...x, status: "done" } : x)),
      }));
      setAssignments((list) =>
        list.map((x) =>
          x.id === a.id ? { ...x, doneTaskCount: (x.doneTaskCount ?? 0) + 1 } : x
        )
      );
      toast.success(`✓ ${res.completion.message}`);
    } catch {
      toast.error("Couldn't mark it — try again?");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "course") {
        await api.deleteCourse(deleteTarget.id);
        setCourses((l) => l.filter((c) => c.id !== deleteTarget.id));
        toast("Course removed. Assignments stay, unattached and unbothered.");
      } else {
        await api.deleteAssignment(deleteTarget.id);
        setAssignments((l) => l.filter((a) => a.id !== deleteTarget.id));
        toast("Assignment removed. Sometimes clearing space is the kindest task.");
      }
    } catch {
      toast.error("Couldn't remove that — try again?");
    } finally {
      setDeleteTarget(null);
    }
  }

  const active = assignments.filter((a) => a.status === "active");
  const finished = assignments.filter((a) => a.status === "done");

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading courses">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Your semester"
        title="Courses & assignments"
        description="Deadlines stay honest here — the path toward them stays gentle. Add courses, track assignments, and grow tiny steps under each one."
      />

      {/* ——— courses ——— */}
      <section aria-labelledby="courses-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="courses-heading" className="flex items-center gap-2 font-display text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-sage-deep" aria-hidden /> Courses
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCourseDialog({ open: true })}
            className="h-9 rounded-full border-border px-4 text-xs font-semibold hover:border-sage/50 hover:bg-sage-soft/40"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add course
          </Button>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm font-medium">No courses yet.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Courses are just gentle containers — add one when you&apos;re ready,
              or create assignments without any.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <motion.article
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group relative rounded-2xl border p-4 shadow-soft transition",
                  COURSE_BG[c.color] ?? COURSE_BG.sage
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.instructor ? `${c.instructor} · ` : ""}
                      {c.assignmentCount ?? 0} assignment{(c.assignmentCount ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${c.name}`}
                        className="h-8 w-8 rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                      <DropdownMenuItem
                        className="gap-2 rounded-xl"
                        onClick={() => setCourseDialog({ open: true, editing: c })}
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 rounded-xl focus:text-rose-deep"
                        onClick={() =>
                          setDeleteTarget({ kind: "course", id: c.id, name: c.name })
                        }
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* ——— assignments ——— */}
      <section aria-labelledby="assignments-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="assignments-heading" className="flex items-center gap-2 font-display text-xl font-semibold">
            <CalendarRange className="h-5 w-5 text-honey-deep" aria-hidden /> Assignments
          </h2>
          <Button
            size="sm"
            onClick={() => setAsgDialog({ open: true })}
            className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add assignment
          </Button>
        </div>

        {active.length === 0 && finished.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
            <SpoonGlyph className="mx-auto h-6 w-6 text-honey/70" />
            <p className="mt-2 text-sm font-medium">Nothing on the horizon.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              When something lands, add it here. MindFlow will help you break it
              into steps so small they almost do themselves.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {active.map((a) => {
                const due = dueLabel(a.dueDate);
                const isOpen = !!expanded[a.id];
                const tasks = assignmentTasks[a.id] ?? [];
                const doneCount = a.doneTaskCount ?? 0;
                const totalCount = a.taskCount ?? 0;
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                const draft = taskDrafts[a.id] ?? { title: "", spoons: 1 as SpoonCost };

                return (
                  <motion.li
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft"
                  >
                    <div className="flex items-start gap-3 p-4 sm:p-5">
                      <button
                        onClick={() => toggleExpand(a)}
                        aria-expanded={isOpen}
                        aria-label={`Toggle steps for ${a.title}`}
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="text-[0.9375rem] font-semibold leading-snug">
                            {a.title}
                          </h3>
                          {a.course && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                              <span
                                aria-hidden
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  COURSE_DOT[a.course.color as CourseColor] ?? "bg-sage"
                                )}
                              />
                              {a.course.name}
                            </span>
                          )}
                        </div>
                        {a.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {a.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium",
                              due.tone === "honey" && "text-honey-deep",
                              due.tone === "peach" && "text-peach-deep",
                              (due.tone === "muted" || due.tone === "sage") && "text-muted-foreground"
                            )}
                          >
                            <CalendarRange className="h-3 w-3" aria-hidden /> {due.text} ·{" "}
                            {shortDate(a.dueDate)}
                          </span>
                          <span className="num text-xs text-muted-foreground">
                            {doneCount}/{totalCount} steps
                          </span>
                        </div>
                        {totalCount > 0 && (
                          <div
                            className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${a.title} progress`}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ type: "spring", stiffness: 80, damping: 20 }}
                              className="h-full rounded-full bg-gradient-to-r from-sage to-lilac"
                            />
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${a.title}`}
                            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                          <DropdownMenuItem
                            className="gap-2 rounded-xl"
                            onClick={() => setAsgDialog({ open: true, editing: a })}
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 rounded-xl focus:text-sage-deep"
                            onClick={async () => {
                              try {
                                await api.updateAssignment(a.id, { status: "done" });
                                setAssignments((l) =>
                                  l.map((x) => (x.id === a.id ? { ...x, status: "done" } : x))
                                );
                                toast.success("Finished — take the win. 🎉");
                              } catch {
                                toast.error("Couldn't update that.");
                              }
                            }}
                          >
                            <Check className="h-4 w-4" /> Mark as done
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 rounded-xl focus:text-rose-deep"
                            onClick={() =>
                              setDeleteTarget({ kind: "assignment", id: a.id, name: a.title })
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* ——— expandable steps ——— */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                        >
                          <div className="border-t border-border/60 bg-background/40 px-4 pb-4 pt-3 sm:px-5">
                            {tasks.length === 0 ? (
                              <p className="py-2 text-xs text-muted-foreground">
                                No steps yet — add the first tiny one below.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {tasks.map((t) => (
                                  <li
                                    key={t.id}
                                    className={cn(
                                      "flex items-center gap-3 rounded-xl px-3 py-2.5",
                                      t.status === "done"
                                        ? "bg-sage-soft/30"
                                        : "bg-card"
                                    )}
                                  >
                                    <button
                                      onClick={() => t.status !== "done" && completeStep(a, t)}
                                      aria-label={`Mark ${t.title} as done`}
                                      className={cn(
                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                                        t.status === "done"
                                          ? "border-sage bg-sage text-white"
                                          : "border-muted-foreground/30 text-transparent hover:border-sage hover:text-sage-deep"
                                      )}
                                    >
                                      <Check className="h-3 w-3" strokeWidth={3} />
                                    </button>
                                    <span
                                      className={cn(
                                        "min-w-0 flex-1 truncate text-sm",
                                        t.status === "done"
                                          ? "text-muted-foreground line-through decoration-sage/50"
                                          : "font-medium"
                                      )}
                                    >
                                      {t.title}
                                    </span>
                                    <SpoonDots cost={t.spoonCost as SpoonCost} />
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* add step */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() =>
                                  setBreakdown({
                                    taskId: tasks.find((t) => t.status !== "done")?.id,
                                    title: a.title,
                                    assignmentId: a.id,
                                  })
                                }
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-lilac-soft px-3.5 text-xs font-semibold text-lilac-deep transition hover:bg-lilac-soft/70"
                              >
                                <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                                Let AI shrink it into micro-steps
                              </button>
                            </div>
                            <form
                              className="mt-3 flex gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                addTinyTask(a);
                              }}
                            >
                              <input
                                value={draft.title}
                                onChange={(e) =>
                                  setTaskDrafts((m) => ({
                                    ...m,
                                    [a.id]: { ...draft, title: e.target.value },
                                  }))
                                }
                                placeholder="Add a tiny step…"
                                aria-label={`Add a step to ${a.title}`}
                                maxLength={160}
                                className="min-h-[44px] flex-1 rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
                              />
                              <div
                                className="flex items-center gap-0.5 rounded-xl border border-border bg-background px-1"
                                role="radiogroup"
                                aria-label="Spoons"
                              >
                                {([1, 2, 3] as SpoonCost[]).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    role="radio"
                                    aria-checked={draft.spoons === s}
                                    aria-label={`${s} spoons`}
                                    onClick={() =>
                                      setTaskDrafts((m) => ({
                                        ...m,
                                        [a.id]: { ...draft, spoons: s },
                                      }))
                                    }
                                    className={cn(
                                      "flex h-9 w-8 items-center justify-center rounded-lg transition",
                                      draft.spoons === s
                                        ? "bg-honey-soft text-honey-deep"
                                        : "text-muted-foreground/50 hover:text-honey-deep"
                                    )}
                                  >
                                    <SpoonGlyph className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                              </div>
                              <Button
                                type="submit"
                                size="icon"
                                disabled={!draft.title.trim()}
                                aria-label="Add step"
                                className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {/* finished assignments */}
        {finished.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setExpanded((m) => ({ ...m, __finished: !m.__finished }))}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-deep"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded.__finished && "rotate-180")} />
              {finished.length} finished 🎉
            </button>
            <AnimatePresence>
              {expanded.__finished && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 space-y-2 overflow-hidden"
                >
                  {finished.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-2xl border border-sage/25 bg-sage-soft/20 px-4 py-3"
                    >
                      <Check className="h-4 w-4 text-sage-deep" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-sage-deep">
                        {a.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {shortDate(a.dueDate)}
                      </span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ——— dialogs ——— */}
      <CourseDialog
        open={courseDialog.open}
        editing={courseDialog.editing}
        courses={courses}
        onOpenChange={(v) => setCourseDialog({ open: v })}
        onSaved={() => void load()}
      />
      <AssignmentDialog
        open={asgDialog.open}
        editing={asgDialog.editing}
        courses={courses}
        onOpenChange={(v) => setAsgDialog({ open: v })}
        onSaved={() => void load()}
        onBreakdownRequest={(a) =>
          setBreakdown({ title: a.title, assignmentId: a.id })
        }
      />

      <BreakdownSheet
        open={breakdown !== null}
        onOpenChange={(v) => !v && setBreakdown(null)}
        taskId={breakdown?.taskId}
        taskTitle={breakdown?.title}
        assignmentId={breakdown?.assignmentId ?? null}
        energy="medium"
        onStepsAdded={() => void load()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              Remove “{deleteTarget?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {deleteTarget?.kind === "course"
                ? "Assignments in this course will stay — they'll just float free. Nothing else is lost."
                : "Its steps and any proof photos go with it. Nothing else is touched."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-full bg-rose-deep text-white hover:bg-rose-deep/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
