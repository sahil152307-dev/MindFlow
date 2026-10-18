"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle calm evening mode"
      title="Toggle calm evening mode"
      className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* CSS-driven swap — hydration safe, no flash */}
      <Sun className="hidden h-[1.15rem] w-[1.15rem] dark:block" aria-hidden />
      <Moon className="h-[1.15rem] w-[1.15rem] dark:hidden" aria-hidden />
    </Button>
  );
}
