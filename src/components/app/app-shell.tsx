"use client";

import { Activity, CalendarRange, Gift, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMindFlow } from "@/lib/store";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { WalletChip } from "@/components/app/wallet-chip";
import { UserMenu } from "@/components/app/user-menu";
import type { PlannerView } from "@/lib/types";

const NAV: { key: PlannerView; label: string; icon: typeof LayoutDashboard }[] =
  [
    { key: "today", label: "Today", icon: LayoutDashboard },
    { key: "insights", label: "Insights", icon: Activity },
    { key: "courses", label: "Courses", icon: CalendarRange },
    { key: "rewards", label: "Rewards", icon: Gift },
  ];

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useMindFlow((s) => s.view);
  const setView = useMindFlow((s) => s.setView);
  const user = useMindFlow((s) => s.user);

  return (
    <div className="calm-bg flex min-h-screen flex-col">
      {/* ——— Header ——— */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => setView("today")}
            aria-label="Go to Today"
            className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo size="sm" />
          </button>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-current={view === key ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === key
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user && <WalletChip user={user} compact className="hidden sm:inline-flex" />}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* ——— Main ——— */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-16 md:pt-8">
        {children}
      </main>

      {/* ——— Footer (desktop) ——— */}
      <footer className="mt-auto hidden border-t border-border/60 bg-card/50 md:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Logo size="sm" withWordmark={false} />
          <p className="text-sm text-muted-foreground">
            Built gently — for days when everything feels heavy.
          </p>
          <p className="num text-xs text-muted-foreground">
            {user ? `${user.streakDays}-day flow` : "—"}
          </p>
        </div>
      </footer>

      {/* ——— Mobile bottom nav ——— */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="grid h-16 grid-cols-4">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-current={view === key ? "page" : undefined}
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                view === key
                  ? "text-sage-deep"
                  : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                  view === key ? "bg-secondary" : "bg-transparent"
                )}
              >
                <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
