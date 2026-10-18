"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Coins,
  Flame,
  Loader2,
  Medal,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { api } from "@/lib/api";
import type { InsightsResponse } from "@/lib/types";

/**
 * Student Insights & Analytics — patterns, never grades.
 * Every number here describes days, not worth. No red,
 * no targets, no "you should have".
 */

const LEVEL_NAME = ["", "Low", "Medium", "High"];

export function InsightsView() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getInsights()
      .then((d) => alive && setData(d))
      .catch(() => alive && toast("Insights went soft — try again in a moment."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading insights">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="rounded-3xl border border-dashed border-border p-6 text-center text-muted-foreground">
        Insights are resting. A refresh usually helps. 🌤️
      </p>
    );
  }

  const hasAnyData =
    data.energy.some((e) => e.value !== null) ||
    data.completions.some((c) => c.count > 0);

  const totalDone14 = data.completions.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-6">
      {/* ——— header ——— */}
      <header>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight sm:text-3xl">
          Your patterns, gently
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Patterns, never grades — these numbers describe days, not worth.
        </p>
      </header>

      {!hasAnyData ? (
        <section className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="font-display text-lg font-semibold">
            Not enough quiet data yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            A few more days of check-ins and finished things — however tiny — and
            patterns will surface here on their own. No rush. 🌤️
          </p>
        </section>
      ) : (
        <>
          {/* ——— stat tiles ——— */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Gentle stats">
            <StatTile
              icon={<Flame className="h-4 w-4" aria-hidden />}
              label="Streak"
              value={data.wallet.streakDays}
              suffix="days"
              tone="sage"
              delay={0}
            />
            <StatTile
              icon={<Medal className="h-4 w-4" aria-hidden />}
              label="Best streak"
              value={data.wallet.longestStreak}
              suffix="days"
              tone="honey"
              delay={0.05}
            />
            <StatTile
              icon={<Coins className="h-4 w-4" aria-hidden />}
              label="Spoon coins"
              value={data.wallet.coins}
              suffix=""
              tone="peach"
              delay={0.1}
            />
            <StatTile
              icon={<Camera className="h-4 w-4" aria-hidden />}
              label="Wins shown"
              value={data.wallet.totalProofs}
              suffix="proofs"
              tone="lilac"
              delay={0.15}
            />
          </section>

          {/* ——— charts ——— */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft" aria-label="Energy trend">
              <h2 className="font-display text-lg font-semibold">
                How your spoons have been flowing
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 14 days · gaps just mean no check-in, that&apos;s allowed
              </p>
              <ChartContainer
                config={{ energy: { label: "Energy", color: "var(--sage)" } }}
                className="mt-4 aspect-auto h-52 w-full"
              >
                <AreaChart data={data.energy} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 4]}
                    ticks={[1, 2, 3]}
                    tickFormatter={(v) => LEVEL_NAME[Number(v)] ?? ""}
                    tickLine={false}
                    axisLine={false}
                    width={62}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(_, p) =>
                          p?.[0]?.payload?.value
                            ? `${LEVEL_NAME[p[0].payload.value]} energy`
                            : "No check-in"
                        }
                      />
                    }
                  />
                  <Area
                    dataKey="value"
                    name="Energy"
                    type="monotone"
                    stroke="var(--sage)"
                    strokeWidth={2.5}
                    fill="var(--sage)"
                    fillOpacity={0.18}
                    connectNulls={false}
                    dot={{ r: 3, fill: "var(--sage)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            </section>

            <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft" aria-label="Completions per day">
              <h2 className="font-display text-lg font-semibold">
                Things finished per day
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 14 days · {totalDone14} finished in all — any size counts
              </p>
              <ChartContainer
                config={{ done: { label: "Finished", color: "var(--honey)" } }}
                className="mt-4 aspect-auto h-52 w-full"
              >
                <BarChart data={data.completions} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Bar
                    dataKey="count"
                    name="Finished"
                    fill="var(--honey)"
                    radius={[6, 6, 2, 2]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ChartContainer>
            </section>
          </div>

          {/* ——— modes ——— */}
          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft" aria-label="Mode usage">
            <h2 className="font-display text-lg font-semibold">
              Which tools you reach for
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This week · using your tools is the work
            </p>
            {data.modes.every((m) => m.count === 0) ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No modes used yet this week — they&apos;ll be here when you need them. 🌿
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.modes.map((m) => {
                  const max = Math.max(1, ...data.modes.map((x) => x.count));
                  const pct = Math.round((m.count / max) * 100);
                  return (
                    <li key={m.mode} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground sm:w-28">
                        {m.mode}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, m.count > 0 ? 8 : 0)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="block h-full rounded-full bg-lilac"
                        />
                      </span>
                      <span className="num w-6 text-right text-xs font-semibold text-lilac-deep">
                        {m.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ——— gentle patterns ——— */}
          {data.patterns.length > 0 && (
            <section className="rounded-3xl border border-sage/30 bg-sage-soft/20 p-5 shadow-soft" aria-label="Gentle patterns">
              <h2 className="font-display text-lg font-semibold">
                Gentle patterns
              </h2>
              <ul className="mt-4 space-y-3">
                {data.patterns.map((p, i) => (
                  <motion.li
                    key={p}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 rounded-2xl bg-card/70 p-3.5"
                  >
                    <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-sage-deep" aria-hidden />
                    <p className="text-sm leading-relaxed text-harmony">{p}</p>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}

          {/* ——— study snapshot ——— */}
          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft" aria-label="Study snapshot">
            <h2 className="font-display text-lg font-semibold">The semester, softly</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-2xl bg-muted/60 p-3.5">
                <dt className="text-xs text-muted-foreground">Courses</dt>
                <dd className="num mt-1 text-xl font-semibold">{data.study.courses}</dd>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3.5">
                <dt className="text-xs text-muted-foreground">Assignments done</dt>
                <dd className="num mt-1 text-xl font-semibold">
                  {data.study.assignmentsDone}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" / "}
                    {data.study.assignmentsTotal}
                  </span>
                </dd>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3.5">
                <dt className="text-xs text-muted-foreground">AI micro-steps done</dt>
                <dd className="num mt-1 text-xl font-semibold">{data.study.microDone}</dd>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3.5">
                <dt className="text-xs text-muted-foreground">Rolled, no guilt</dt>
                <dd className="num mt-1 text-xl font-semibold">{data.study.rolledTotal}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  suffix,
  tone,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  tone: "sage" | "honey" | "peach" | "lilac";
  delay: number;
}) {
  const tones = {
    sage: "border-sage/30 bg-sage-soft/25 text-sage-deep",
    honey: "border-honey/40 bg-honey-soft/30 text-honey-deep",
    peach: "border-peach/30 bg-peach-soft/30 text-peach-deep",
    lilac: "border-lilac/40 bg-lilac-soft/30 text-lilac-deep",
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-3xl border p-4 shadow-soft ${tones[tone]}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="num mt-2 text-3xl font-semibold leading-none">
        {value}
        {suffix && (
          <span className="ml-1.5 text-sm font-medium opacity-70">{suffix}</span>
        )}
      </p>
    </motion.div>
  );
}
