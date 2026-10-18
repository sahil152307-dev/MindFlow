"use client";

import { useEffect, useState } from "react";
import { useMindFlow } from "@/lib/store";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app/app-shell";
import { TourOverlay, TOUR_STEP_COUNT } from "@/components/app/tour";
import { TodayView } from "@/components/app/views/today-view";
import { InsightsView } from "@/components/app/views/insights-view";
import { CoursesView } from "@/components/app/views/courses-view";
import { RewardsView } from "@/components/app/views/rewards-view";
import { WelcomeView } from "@/components/app/views/welcome-view";

export default function Home() {
  const user = useMindFlow((s) => s.user);
  const hydrated = useMindFlow((s) => s.hydrated);
  const view = useMindFlow((s) => s.view);
  const setView = useMindFlow((s) => s.setView);

  /* Guided demo tour state (session-scoped) */
  const [tourStep, setTourStep] = useState<number | null>(null);

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

  // Logging out ends any running tour — render-phase reset (React's
  // canonical derived-state pattern, avoids setState-in-effect).
  if (!user && tourStep !== null) {
    setTourStep(null);
  }

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
    return <WelcomeView onTourStart={() => setTourStep(0)} />;
  }

  return (
    <AppShell>
      {view === "today" && <TodayView />}
      {view === "insights" && <InsightsView />}
      {view === "courses" && <CoursesView />}
      {view === "rewards" && <RewardsView />}

      {tourStep !== null && (
        <TourOverlay
          step={tourStep}
          onNext={() =>
            setTourStep((s) =>
              s === null ? s : Math.min(s + 1, TOUR_STEP_COUNT - 1)
            )
          }
          onBack={() => setTourStep((s) => (s === null ? s : Math.max(s - 1, 0)))}
          onSkip={() => {
            setTourStep(null);
            setView("today");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </AppShell>
  );
}
