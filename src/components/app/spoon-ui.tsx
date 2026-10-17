"use client";

import { cn } from "@/lib/utils";
import type { EnergyLevel, SpoonCost } from "@/lib/types";

/** A soft, custom spoon glyph — the app's unit of energy. */
export function SpoonGlyph({
  className,
  filled = true,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-4 w-4", className)}
    >
      <path
        d="M12 2.5c2.6 0 4.5 2 4.5 4.9 0 2.2-1.2 3.9-3 4.6l.4 8.3a1.9 1.9 0 1 1-3.8 0l.4-8.3c-1.8-.7-3-2.4-3-4.6 0-2.9 1.9-4.9 4.5-4.9Z"
        className={cn(
          filled ? "fill-current" : "fill-none stroke-current"
        )}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 1–3 spoon cost indicator. */
export function SpoonDots({ cost, className }: { cost: SpoonCost; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-honey-deep", className)}
      title={`${cost} spoon${cost === 1 ? "" : "s"} of energy`}
    >
      {[1, 2, 3].map((i) => (
        <SpoonGlyph key={i} filled={i <= cost} className={cn("h-3.5 w-3.5", i > cost && "opacity-30")} />
      ))}
      <span className="sr-only">{cost} spoons</span>
    </span>
  );
}

const LEVEL_STYLES: Record<
  EnergyLevel,
  { chip: string; label: string; hint: string }
> = {
  low: {
    chip: "bg-rose-soft text-rose-deep",
    label: "Low",
    hint: "A rough-spoons day. We go tiny.",
  },
  medium: {
    chip: "bg-honey-soft text-honey-deep",
    label: "Medium",
    hint: "Steady energy. A balanced bite.",
  },
  high: {
    chip: "bg-sage-soft text-sage-deep",
    label: "High",
    hint: "Spoons are plentiful — take a bigger, gentle bite.",
  },
};

export function EnergyChip({ level, className }: { level: EnergyLevel; className?: string }) {
  const s = LEVEL_STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        s.chip,
        className
      )}
    >
      <SpoonGlyph className="h-3 w-3" />
      {s.label} spoons
    </span>
  );
}

export { LEVEL_STYLES };
