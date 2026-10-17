"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { compressImage } from "@/lib/format";
import { useMindFlow } from "@/lib/store";
import type { Task } from "@/lib/types";

/**
 * "Show your win" — optional visual proof after completing a task.
 * Photo is compressed in-browser, verified gently by a vision model,
 * and always rewarded (+10 Spoon Coins, benefit of the doubt by design).
 */
export function ProofButton({
  task,
  onUploaded,
  size = "sm",
}: {
  task: Task;
  onUploaded: (t: Task, note: string, wallet: { coins: number; tokens: number }) => void;
  size?: "sm" | "md";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const patchUser = useMindFlow((s) => s.patchUser);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("Photos only — but any photo of your work counts.");
      return;
    }
    setBusy(true);
    try {
      const image = await compressImage(file);
      const res = await api.uploadProof(task.id, image);
      toast.success(res.note, {
        description: res.verified ? undefined : "Benefit of the doubt — your effort counts.",
      });
      patchUser({ coins: res.wallet.coins, tokens: res.wallet.tokens });
      onUploaded({ ...task, hasProof: true }, res.note, res.wallet);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={
          size === "sm"
            ? "h-8 gap-1.5 rounded-full border-honey/50 bg-honey-soft/40 px-3 text-xs font-semibold text-honey-deep hover:bg-honey-soft/70"
            : "h-11 gap-2 rounded-2xl border-honey/50 bg-honey-soft/40 px-5 text-sm font-semibold text-honey-deep hover:bg-honey-soft/70"
        }
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
        Show your win · +10 🪙
      </Button>
    </>
  );
}
