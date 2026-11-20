import { Apple, BookOpen, Footprints, GlassWater, Moon, Smile, Sofa, type LucideIcon } from "lucide-react";
import type { SphereKey } from "./checkin";

/**
 * Visual identity of the 7 spheres (docs/DESIGN.md §2). Full class strings so
 * Tailwind can see them at build time.
 */
export interface SphereStyle {
  icon: LucideIcon;
  /** Hex of the base color (for SVG fills). */
  hex: string;
  base: string; // bg in base color
  text: string; // text in base color
  tint: string; // light background
  ink: string; // readable text on tint
  ring: string; // border in base color
}

export const SPHERE_STYLE: Record<SphereKey, SphereStyle> = {
  sleep: { icon: Moon, hex: "#6366F1", base: "bg-s-sleep", text: "text-s-sleep", tint: "bg-s-sleep-tint", ink: "text-s-sleep-ink", ring: "border-s-sleep" },
  food: { icon: Apple, hex: "#F08A3C", base: "bg-s-food", text: "text-s-food", tint: "bg-s-food-tint", ink: "text-s-food-ink", ring: "border-s-food" },
  caffeine: { icon: GlassWater, hex: "#14A3B8", base: "bg-s-caffeine", text: "text-s-caffeine", tint: "bg-s-caffeine-tint", ink: "text-s-caffeine-ink", ring: "border-s-caffeine" },
  mind: { icon: Smile, hex: "#E8679A", base: "bg-s-mind", text: "text-s-mind", tint: "bg-s-mind-tint", ink: "text-s-mind-ink", ring: "border-s-mind" },
  activity: { icon: Footprints, hex: "#3FAE5A", base: "bg-s-activity", text: "text-s-activity", tint: "bg-s-activity-tint", ink: "text-s-activity-ink", ring: "border-s-activity" },
  work: { icon: BookOpen, hex: "#1E5BFF", base: "bg-s-work", text: "text-s-work", tint: "bg-s-work-tint", ink: "text-s-work-ink", ring: "border-s-work" },
  rest: { icon: Sofa, hex: "#E0A325", base: "bg-s-rest", text: "text-s-rest", tint: "bg-s-rest-tint", ink: "text-s-rest-ink", ring: "border-s-rest" },
};
