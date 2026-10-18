"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlannerView, SessionUser } from "@/lib/types";

interface MindFlowState {
  /* Session */
  user: SessionUser | null;
  hydrated: boolean;

  /* Navigation (single-route SPA) */
  view: PlannerView;

  /* Ephemeral UI state — readDismissedAt persists ("Not today" means today) */
  readDismissedAt: string | null;

  /* Actions */
  setUser: (user: SessionUser | null) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
  setView: (view: PlannerView) => void;
  setHydrated: (v: boolean) => void;
  dismissRead: () => void;
}

export const useMindFlow = create<MindFlowState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      view: "today",
      readDismissedAt: null,
      setUser: (user) => set({ user }),
      patchUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      setView: (view) => set({ view }),
      setHydrated: (v) => set({ hydrated: v }),
      dismissRead: () => set({ readDismissedAt: new Date().toDateString() }),
    }),
    {
      name: "mindflow-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, readDismissedAt: s.readDismissedAt }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
