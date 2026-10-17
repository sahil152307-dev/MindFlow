"use client";

import { Waves } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  withWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}) {
  const box =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-xl";
  const icon = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const text =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          box,
          "inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-sage to-lilac text-white shadow-soft"
        )}
      >
        <Waves className={icon} strokeWidth={2.2} />
      </span>
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn("font-display font-semibold text-foreground", text)}
          >
            MindFlow
          </span>
          <span className="mt-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            adaptive planner
          </span>
        </span>
      )}
    </span>
  );
}
