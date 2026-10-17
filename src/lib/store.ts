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

  /* Actions */
  setUser: (user: SessionUser | null) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
  setView: (view: PlannerView) => void;
  setHydrated: (v: boolean) => void;
}

export const useMindFlow = create<MindFlowState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      view: "today",
      setUser: (user) => set({ user }),
      patchUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      setView: (view) => set({ view }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "mindflow-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
