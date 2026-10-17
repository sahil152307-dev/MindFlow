"use client";

import { useEffect } from "react";
import { useMindFlow } from "@/lib/store";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app/app-shell";
import { TodayView } from "@/components/app/views/today-view";
import { CoursesView } from "@/components/app/views/courses-view";
import { RewardsView } from "@/components/app/views/rewards-view";
import { WelcomeView } from "@/components/app/views/welcome-view";

export default function Home() {
  const user = useMindFlow((s) => s.user);
  const hydrated = useMindFlow((s) => s.hydrated);
  const view = useMindFlow((s) => s.view);

  // keep the API client's uid fallback in sync with the persisted session
  useEffect(() => {
    api.setUid(user?.id ?? null);
    if (user) {
      // gently re-sync the wallet in case another device moved it
      api
        .login(user.name, user.email, false)
        .then((res) => useMindFlow.getState().setUser(res.user))
        .catch(() => undefined);
    }
  }, [user?.id]);  

  if (!hydrated) {
    return (
      <div className="calm-bg flex min-h-screen items-center justify-center">
        <div
          className="h-10 w-10 animate-pulse rounded-full bg-gradient-to-br from-sage to-lilac"
          aria-label="Loading MindFlow"
          role="status"
        />
      </div>
    );
  }

  if (!user) {
    return <WelcomeView />;
  }

  return (
    <AppShell>
      {view === "today" && <TodayView />}
      {view === "courses" && <CoursesView />}
      {view === "rewards" && <RewardsView />}
    </AppShell>
  );
}
