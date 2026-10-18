"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Loader2, Sparkles, Wind, Coins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import { api } from "@/lib/api";
import { useMindFlow } from "@/lib/store";
import type { SessionUser } from "@/lib/types";
import { SpoonGlyph } from "@/components/app/spoon-ui";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, type: "spring" as const, stiffness: 120, damping: 18 },
  }),
};

const FEATURES = [
  { icon: SpoonGlyph, label: "Energy check-ins" },
  { icon: Sparkles, label: "AI micro-steps" },
  { icon: Wind, label: "Gentle rollovers" },
  { icon: Coins, label: "Proof rewards" },
];

export function WelcomeView({ onTourStart }: { onTourStart?: () => void }) {
  const setUser = useMindFlow((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"fresh" | "sample" | "tour" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(withSample: boolean, tour = false) {
    setError(null);
    if (!name.trim()) {
      setError("What should we call you?");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look quite right yet.");
      return;
    }
    setBusy(withSample ? "sample" : "fresh");
    if (tour) setBusy("tour");
    try {
      const res = await api.login(name.trim(), email.trim(), withSample);
      const u: SessionUser = res.user;
      api.setUid(u.id);
      setUser(u);
      toast(
        tour
          ? `Welcome in, ${u.name.split(" ")[0]} — let's walk through it together. 🌿`
          : withSample
            ? `Welcome in, ${u.name.split(" ")[0]} — we set up a sample semester to explore. 🌿`
            : `Welcome, ${u.name.split(" ")[0]}. Empty canvas, zero pressure. 🌱`
      );
      if (tour) onTourStart?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign you in. Try again?");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="calm-bg relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg">
        <motion.div
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Logo size="lg" className="mb-8" />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-display text-[2rem] font-semibold leading-[1.15] text-foreground sm:text-4xl"
          >
            Plan around your energy,{" "}
            <span className="text-sage-deep">not against it.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-4 max-w-md text-harmony text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]"
          >
            A calm planner for students with ADHD, anxiety and executive
            dysfunction. No red overdue badges. No alarms. Just tiny,
            doable next steps — and zero guilt on the hard days.
          </motion.p>

          <motion.form
            variants={fadeUp}
            custom={3}
            className="mt-8 w-full max-w-sm space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              enter(false);
            }}
          >
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
              <label htmlFor="mf-name" className="sr-only">
                Your name
              </label>
              <input
                id="mf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                maxLength={60}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-ring/40"
              />
              <div className="h-2.5" />
              <label htmlFor="mf-email" className="sr-only">
                Email
              </label>
              <input
                id="mf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                autoComplete="email"
                maxLength={120}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-peach-deep"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={busy !== null}
              className="h-12 w-full rounded-2xl bg-primary text-[0.9375rem] font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
            >
              {busy === "fresh" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start fresh — it's a blank, kind page"
              )}
            </Button>

            <div className="flex items-center gap-3" aria-hidden>
              <span className="fade-rule flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <span className="fade-rule flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => enter(true)}
              className="h-12 w-full rounded-2xl border-border bg-card text-[0.9375rem] font-semibold text-foreground shadow-soft transition hover:border-sage/50 hover:bg-secondary/60"
            >
              {busy === "sample" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Explore with sample data 🌿</>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => enter(true, true)}
              className="h-11 w-full rounded-2xl text-sm font-medium text-lilac-deep transition hover:bg-lilac-soft/40"
            >
              {busy === "tour" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Compass className="mr-1.5 h-4 w-4" aria-hidden /> Take the
                  2-minute tour
                </>
              )}
            </Button>
          </motion.form>

          <motion.ul
            variants={fadeUp}
            custom={4}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            aria-label="What MindFlow gives you"
          >
            {FEATURES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-sage-deep" />
                {label}
              </li>
            ))}
          </motion.ul>

          <motion.p
            variants={fadeUp}
            custom={5}
            className="mt-6 max-w-xs text-xs leading-relaxed text-muted-foreground/80"
          >
            Built on spoon theory — your daily energy decides the plan, never
            the other way around.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
