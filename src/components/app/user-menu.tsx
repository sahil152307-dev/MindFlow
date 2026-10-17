"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useMindFlow } from "@/lib/store";
import { toast } from "sonner";

export function UserMenu() {
  const user = useMindFlow((s) => s.user);
  const setUser = useMindFlow((s) => s.setUser);
  const router = useRouter();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="h-10 w-10 rounded-full bg-gradient-to-br from-honey to-rose text-sm font-semibold text-white shadow-soft outline-none ring-sage/40 transition hover:brightness-105 focus-visible:ring-2 data-[state=open]:ring-2"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="font-normal">
          <p className="font-display text-base font-semibold leading-tight">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 rounded-xl text-muted-foreground focus:text-rose-deep"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {
              /* session is local anyway */
            }
            setUser(null);
            toast("Signed out gently. Come back whenever you're ready. 🌿");
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
