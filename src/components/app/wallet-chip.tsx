"use client";

import { Coins, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";

export function WalletChip({
  user,
  compact = false,
  className,
}: {
  user: SessionUser;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 shadow-soft",
        className
      )}
    >
      <span className="inline-flex items-center gap-1 text-honey-deep" title="Spoon Coins">
        <Coins className="h-3.5 w-3.5" aria-hidden />
        <span className="num text-sm font-semibold">{user.coins}</span>
        <span className="sr-only">spoon coins</span>
      </span>
      <span aria-hidden className="h-3.5 w-px bg-border" />
      <span className="inline-flex items-center gap-1 text-lilac-deep" title="Consistency Tokens">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        <span className="num text-sm font-semibold">{user.tokens}</span>
        <span className="sr-only">consistency tokens</span>
      </span>
      {!compact && (
        <span aria-hidden className="h-3.5 w-px bg-border" />
      )}
      {!compact && (
        <span className="text-xs font-medium text-muted-foreground">
          {user.streakDays > 0
            ? `${user.streakDays}-day flow`
            : "start a flow"}
        </span>
      )}
    </div>
  );
}
