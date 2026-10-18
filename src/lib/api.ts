"use client";

import type {
  Assignment,
  Course,
  DayPlan,
  EnergyLevel,
  EnergyLog,
  Goodie,
  InsightsResponse,
  NowResponse,
  PlannerMode,
  ProofRecord,
  Recommendation,
  SessionUser,
  Task,
  Wallet,
} from "@/lib/types";

/**
 * Tiny typed API client. Always sends the userId as a query fallback so the
 * demo stays functional even if the session cookie is unavailable in a
 * sandbox iframe context.
 */
class Api {
  private uid: string | null = null;

  setUid(id: string | null) {
    this.uid = id;
  }

  private qs(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params);
    if (this.uid && !search.has("userId")) search.set("userId", this.uid);
    const s = search.toString();
    return s ? `?${s}` : "";
  }

  private async handle<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went soft. Try again.");
    return data as T;
  }

  private get<T>(path: string, params: Record<string, string> = {}) {
    return fetch(`/api${path}${this.qs(params)}`).then((r) => this.handle<T>(r));
  }

  private post<T>(path: string, body?: unknown) {
    return fetch(`/api${path}${this.qs()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }).then((r) => this.handle<T>(r));
  }

  private patch<T>(path: string, body: unknown) {
    return fetch(`/api${path}${this.qs()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => this.handle<T>(r));
  }

  private delete<T>(path: string) {
    return fetch(`/api${path}${this.qs()}`, { method: "DELETE" }).then((r) =>
      this.handle<T>(r)
    );
  }

  /* ——— auth ——— */
  login(name: string, email: string, withSample: boolean) {
    return this.post<{ user: SessionUser; seeded: boolean }>("/auth/login", {
      name,
      email,
      withSample,
    });
  }
  logout() {
    return this.post<{ ok: boolean }>("/auth/logout");
  }

  /* ——— courses ——— */
  listCourses() {
    return this.get<{ courses: Course[] }>("/courses");
  }
  createCourse(name: string, color: string, instructor?: string) {
    return this.post<{ course: Course }>("/courses", { name, color, instructor });
  }
  updateCourse(id: string, patch: Partial<Pick<Course, "name" | "color" | "instructor">>) {
    return this.patch<{ course: Course }>(`/courses/${id}`, patch);
  }
  deleteCourse(id: string) {
    return this.delete<{ ok: boolean }>(`/courses/${id}`);
  }

  /* ——— assignments ——— */
  listAssignments() {
    return this.get<{ assignments: Assignment[] }>("/assignments");
  }
  createAssignment(data: {
    title: string;
    description?: string;
    courseId?: string | null;
    dueDate: string;
    starterTasks?: { title: string; spoonCost: number; notes?: string }[];
  }) {
    return this.post<{ assignment: Assignment }>("/assignments", data);
  }
  updateAssignment(
    id: string,
    patch: Partial<Pick<Assignment, "title" | "description" | "status" | "courseId">> & {
      dueDate?: string;
    }
  ) {
    return this.patch<{ assignment: Assignment }>(`/assignments/${id}`, patch);
  }
  deleteAssignment(id: string) {
    return this.delete<{ ok: boolean }>(`/assignments/${id}`);
  }

  /* ——— tasks ——— */
  listTasks(filter: "today" | "overdue" | "backlog" | "done" | "done-today" | "all", assignmentId?: string) {
    return this.get<{ tasks: Task[] }>(
      "/tasks",
      assignmentId ? { filter, assignmentId } : { filter }
    );
  }
  createTask(data: {
    title: string;
    notes?: string;
    assignmentId?: string | null;
    spoonCost?: number;
    isMicro?: boolean;
    plannedDate?: string | null;
  }) {
    return this.post<{ task: Task }>("/tasks", data);
  }
  createTasks(
    tasks: { title: string; spoonCost: number; notes?: string }[],
    assignmentId?: string | null,
    plannedDate?: string | null
  ) {
    return this.post<{ tasks: Task[] }>("/tasks", {
      tasks,
      assignmentId,
      plannedDate,
    });
  }
  updateTask(
    id: string,
    patch: Partial<Pick<Task, "title" | "notes" | "status" | "spoonCost" | "position" | "plannedDate">>
  ) {
    return this.patch<{ task: Task }>(`/tasks/${id}`, patch);
  }
  deleteTask(id: string) {
    return this.delete<{ ok: boolean }>(`/tasks/${id}`);
  }
  completeTask(id: string) {
    return this.post<{
      task: Task;
      alreadyDone?: boolean;
      completion: {
        streakDays: number;
        longestStreak: number;
        tokensAwarded: number;
        weekProgress: number;
        firstWinToday: boolean;
        message: string;
      };
      wallet: { coins: number; tokens: number; streakDays: number; longestStreak: number } | null;
    }>(`/tasks/${id}/complete`);
  }
  rolloverTask(id: string, to: "tomorrow" | "weekend" | "next-week" = "tomorrow") {
    return this.post<{ task: Task; message: string }>(
      `/tasks/${id}/rollover`,
      { to }
    );
  }
  /* ——— proof ——— */
  uploadProof(taskId: string, image: string) {
    return this.post<{
      proof: ProofRecord;
      verified: boolean;
      note: string;
      wallet: { coins: number; tokens: number };
    }>(`/tasks/${taskId}/proof`, { image });
  }

  /* ——— energy ——— */
  getEnergy() {
    return this.get<{ today: EnergyLog | null; recent: EnergyLog[] }>("/energy");
  }
  checkIn(level: EnergyLevel, note?: string) {
    return this.post<{ log: EnergyLog }>("/energy", { level, note });
  }

  /* ——— planning & modes ——— */
  generatePlan(energy: EnergyLevel) {
    return this.post<{ plan: DayPlan }>("/plan", { energy });
  }
  getNow() {
    return this.get<NowResponse>("/now");
  }
  getRecommendation() {
    return this.get<{ recommendation: Recommendation }>("/ai/recommend");
  }
  getInsights() {
    return this.get<InsightsResponse>("/insights");
  }
  logMode(mode: PlannerMode) {
    return this.post<{ ok: boolean }>("/modes", { mode }).catch(() => ({ ok: false }));
  }

  /* ——— rewards ——— */
  getRewards() {
    return this.get<{ wallet: Wallet }>("/rewards");
  }
  claimGoodie(key: string) {
    return this.post<{ goodie: Goodie; wallet: { tokens: number } }>("/goodies/claim", {
      key,
    });
  }

  /* ——— AI ——— */
  breakdown(data: {
    taskId?: string;
    title?: string;
    context?: string;
    energy: EnergyLevel;
    reason?: "too-big" | "where-to-start" | "unclear";
  }) {
    return this.post<{
      microSteps: { title: string; spoonCost: number; note?: string }[];
      encouragement: string;
      source: "ai" | "heuristic";
      taskTitle: string;
      assignmentId?: string | null;
    }>("/ai/breakdown", data);
  }
}

export const api = new Api();
