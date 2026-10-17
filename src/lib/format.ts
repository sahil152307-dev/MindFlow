import { differenceInCalendarDays, parseISO } from "date-fns";

export function dueLabel(dueISO: string): { text: string; tone: "sage" | "honey" | "peach" | "muted" } {
  const days = differenceInCalendarDays(parseISO(dueISO), new Date());
  if (days < 0)
    return { text: `due date passed ${Math.abs(days)}d ago`, tone: "peach" };
  if (days === 0) return { text: "due today", tone: "honey" };
  if (days === 1) return { text: "due tomorrow", tone: "honey" };
  if (days <= 3) return { text: `due in ${days} days`, tone: "honey" };
  return { text: `due in ${days} days`, tone: "muted" };
}

export function friendlyDate(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function shortDate(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function greetingFor(h: number): string {
  if (h < 5) return "Still awake";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Winding down";
}

/** Downscale + compress a proof photo in the browser before upload. */
export function compressImage(file: File, maxSide = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like an image we can open."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
