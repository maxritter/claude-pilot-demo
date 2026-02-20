import type { LabelColor } from "@/lib/types";

export const LABEL_COLORS: Record<LabelColor, { bg: string; text: string; ring: string }> = {
  red:    { bg: "bg-red-100",    text: "text-red-700",    ring: "ring-red-300" },
  orange: { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-300" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-yellow-300" },
  green:  { bg: "bg-green-100",  text: "text-green-700",  ring: "ring-green-300" },
  blue:   { bg: "bg-blue-100",   text: "text-blue-700",   ring: "ring-blue-300" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-300" },
  pink:   { bg: "bg-pink-100",   text: "text-pink-700",   ring: "ring-pink-300" },
  gray:   { bg: "bg-gray-100",   text: "text-gray-700",   ring: "ring-gray-300" },
};

export const LABEL_SWATCH_BG: Record<LabelColor, string> = {
  red:    "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  green:  "bg-green-400",
  blue:   "bg-blue-400",
  purple: "bg-purple-400",
  pink:   "bg-pink-400",
  gray:   "bg-gray-400",
};
