"use client";

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-deep">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-[1.75rem]">
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-harmony text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
