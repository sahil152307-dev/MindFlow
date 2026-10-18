import type { Goodie } from "@/lib/types";

/**
 * The MindFlow goodies shelf. The flagship unlock lands at 300 tokens —
 * the milestone from the PRD — with a couple of gentler stops along the
 * way so the dopamine loop has waypoints, not just a horizon.
 */
export const GOODIES_CATALOG: Goodie[] = [
  {
    key: "sticker-pack",
    name: "Calm Creatures Sticker Pack",
    tagline: "Six soft vinyl friends for your laptop or journal.",
    cost: 150,
    emoji: "🦦",
    accent: "sage",
  },
  {
    key: "wallpaper-pack",
    name: "Soft Horizons Wallpapers",
    tagline: "A set of 10 pastel gradients for phone & desktop.",
    cost: 200,
    emoji: "🌅",
    accent: "peach",
  },
  {
    key: "fidget-cube",
    name: "MindFlow Fidget Cube",
    tagline: "Quiet-click cube for restless study hands.",
    cost: 250,
    emoji: "🧊",
    accent: "lilac",
  },
  {
    key: "tote",
    name: "\"Small Steps Count\" Tote",
    tagline: "The flagship unlock — heavy canvas, gentle message.",
    cost: 300,
    emoji: "👜",
    accent: "honey",
  },
  {
    key: "cozy-box",
    name: "The Cozy Box",
    tagline: "Tea, fuzzy socks & a squishy — a rest kit, delivered.",
    cost: 300,
    emoji: "📦",
    accent: "rose",
  },
];
