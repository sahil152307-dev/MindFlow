"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { COURSE_COLORS, type Assignment, type Course, type CourseColor } from "@/lib/types";

/* ———————————————————————— Add / Edit Course ———————————————————————— */

const COLOR_CLASSES: Record<CourseColor, { dot: string; ring: string }> = {
  sage: { dot: "bg-sage", ring: "ring-sage" },
  honey: { dot: "bg-honey", ring: "ring-honey" },
  rose: { dot: "bg-rose", ring: "ring-rose" },
  lilac: { dot: "bg-lilac", ring: "ring-lilac" },
  peach: { dot: "bg-honey", ring: "ring-honey" },
};

export function CourseDialog({
  open,
  onOpenChange,
  courses,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courses: Course[];
  editing?: Course | null;
  onSaved: (c: Course) => void;
}) {
  const [name, setName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [color, setColor] = useState<CourseColor>("sage");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setInstructor(editing?.instructor ?? "");
      if (editing?.color && COURSE_COLORS.includes(editing.color)) {
        setColor(editing.color);
      } else {
        setColor(COURSE_COLORS[courses.length % COURSE_COLORS.length]);
      }
    }
  }, [open, editing, courses]);

  async function save() {
    if (!name.trim()) {
      toast("Courses need a name — even a nickname works.");
      return;
    }
    setBusy(true);
    try {
      const res = editing
        ? await api.updateCourse(editing.id, { name: name.trim(), instructor: instructor.trim() || undefined, color })
        : await api.createCourse(name.trim(), color, instructor.trim() || undefined);
      toast(editing ? "Course updated." : "Course added. One gentle container at a time.");
      onSaved({ ...res.course, color });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? "Edit course" : "Add a course"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="course-name" className="text-xs font-semibold text-muted-foreground">
              Course name
            </label>
            <input
              id="course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cognitive Psychology"
              maxLength={80}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="course-instructor" className="text-xs font-semibold text-muted-foreground">
              Instructor (optional)
            </label>
            <input
              id="course-instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="e.g. Dr. Meera"
              maxLength={80}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Colour</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Course colour">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    COLOR_CLASSES[c].dot,
                    color === c
                      ? cn("ring-2 ring-offset-2 ring-offset-background", COLOR_CLASSES[c].ring, "scale-110")
                      : "opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Add course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ———————————————————————— Add / Edit Assignment ———————————————————————— */

export function AssignmentDialog({
  open,
  onOpenChange,
  courses,
  editing,
  onSaved,
  onBreakdownRequest,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courses: Course[];
  editing?: Assignment | null;
  onSaved: (a: Assignment) => void;
  onBreakdownRequest?: (a: Assignment) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setCourseId(editing?.courseId ?? "");
      setDueDate(
        editing
          ? new Date(editing.dueDate).toISOString().slice(0, 10)
          : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      );
    }
  }, [open, editing]);

  async function save() {
    if (!title.trim()) {
      toast("What's the assignment called?");
      return;
    }
    if (!dueDate) {
      toast("Pick a due date — we'll plan gently toward it.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        courseId: courseId || null,
        dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      };
      const res = editing
        ? await api.updateAssignment(editing.id, payload)
        : await api.createAssignment(payload);
      toast(
        editing
          ? "Assignment updated."
          : "Assignment saved. Want to break it into micro-steps next?"
      );
      onSaved(res.assignment);
      onOpenChange(false);
      if (!editing && onBreakdownRequest) {
        onBreakdownRequest(res.assignment);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? "Edit assignment" : "Add an assignment"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="asg-title" className="text-xs font-semibold text-muted-foreground">
              What is it?
            </label>
            <input
              id="asg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Essay — Working memory & attention"
              maxLength={140}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="asg-course" className="text-xs font-semibold text-muted-foreground">
                Course
              </label>
              <select
                id="asg-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="h-[42px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
              >
                <option value="">No course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="asg-due" className="text-xs font-semibold text-muted-foreground">
                Due date (stays fixed — that's the deal)
              </label>
              <input
                id="asg-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-[42px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="asg-desc" className="text-xs font-semibold text-muted-foreground">
              Instructions / notes (optional)
            </label>
            <Textarea
              id="asg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the brief, or describe what 'done' looks like…"
              className="min-h-[90px] rounded-xl"
              maxLength={800}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Add assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
