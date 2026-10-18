"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ChevronLeft,
  Coins,
  Compass,
  Gauge,
  Signpost,
  SkipForward,
  Sparkles,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMindFlow } from "@/lib/store";
import type { PlannerView } from "@/lib/types";

/**
 * The 2-minute guided demo tour. A calm bottom-docked card —
 * no spotlight gymnastics, no fragile positioning math. Steps
 * that live in other views actually navigate there; the app
 * itself is the visual. Skip anytime; nothing here is a test.
 */

interface TourStep {
  view: PlannerView; // navigate to this view
  scrollSelector?: string; // then scroll here (optional)
  icon: typeof Sparkles;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    view: "today",
    icon: Sparkles,
    title: "Welcome in",
    body: "This is a 2-minute tour of your calm corner. Skip anytime — nothing here is a test, and everything stays where you leave it.",
  },
  {
    view: "today",
    scrollSelector: "#checkin-heading",
    icon: Gauge,
    title: "Start with three taps",
    body: "The daily check-in tells the planner how much today holds. Low-energy days get tiny plans — that's the feature, not a fallback.",
  },
  {
    view: "today",
    icon: Compass,
    title: "Five doors, one feeling each",
    body: "Plan My Day, I'm Stuck, Low Energy, Motivated, Rest — pick whatever today is. There are no wrong doors, and Rest counts as a plan.",
  },
  {
    view: "today",
    scrollSelector: "#now-heading",
    icon: Signpost,
    title: "For the frozen moments",
    body: "\"What should I do now?\" picks one kind next step — energy, due dates and all. And AI can shrink anything into embarrassingly small steps.",
  },
  {
    view: "insights",
    icon: Activity,
    title: "Patterns, never grades",
    body: "Your energy, wins and habits — drawn softly. No targets, no red. The numbers describe days, not worth.",
  },
  {
    view: "rewards",
    icon: Coins,
    title: "Proof pays, gently",
    body: "Show a photo of your finished thing: +10 Spoon Coins, always — even a blurry photo counts. Consistent weeks pay +7 tokens, and 300 tokens unlock the goodie shelf.",
  },
  {
    view: "today",
    icon: Sprout,
    title: "Your turn",
    body: "That's the whole idea: plan around your energy, not against it. The tour ends here — the planner is yours now.",
  },
];

export function TourOverlay({
  step,
  onNext,
  onBack,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const setView = useMindFlow((s) => s.setView);
  const user = useMindFlow((s) => s.user);
  const firstName = user?.name.split(" ")[0] ?? "friend";

  const total = STEPS.length;
  const current = STEPS[Math.min(step, total - 1)];
  const isLast = step >= total - 1;
  const Icon = current.icon;

  /* Each step navigates for real, then scrolls if it has a target */
  useEffect(() => {
    setView(current.view);
    const t = window.setTimeout(() => {
      if (current.scrollSelector) {
        document
          .querySelector(current.scrollSelector)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [step, current.scrollSelector, current.view, setView]);

  return (
    <AnimatePresence>
      <motion.div
        key="tour"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        role="dialog"
        aria-label="Guided tour"
        className="fixed inset-x-0 bottom-20 z-50 mx-auto w-[min(38rem,calc(100vw-2rem))] md:bottom-8"
      >
        <div className="rounded-3xl border border-lilac/40 bg-card/95 p-5 shadow-lift backdrop-blur-md sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lilac-soft text-lilac-deep">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold leading-snug">
                  {step === 0 ? `${current.title}, ${firstName}` : current.title}
                </h2>
                <span className="num shrink-0 text-xs font-medium text-muted-foreground">
                  {step + 1} / {total}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-harmony">
                {current.body}
              </p>

              {/* progress dots */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5" aria-hidden>
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === step
                          ? "w-5 bg-lilac-deep"
                          : i < step
                            ? "w-1.5 bg-lilac/60"
                            : "w-1.5 bg-border"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {step > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onBack}
                      className="h-9 rounded-full px-3 text-muted-foreground hover:text-foreground"
                      aria-label="Previous step"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  {!isLast && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSkip}
                      className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <SkipForward className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Skip tour
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={isLast ? onSkip : onNext}
                    className="h-9 rounded-full bg-lilac-deep px-5 text-xs font-semibold text-white hover:bg-lilac-deep/90"
                  >
                    {isLast ? "Start planning" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export const TOUR_STEP_COUNT = STEPS.length;
