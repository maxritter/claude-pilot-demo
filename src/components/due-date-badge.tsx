"use client";

import { Clock } from "lucide-react";
import { getRelativeDate } from "@/lib/date-utils";

interface DueDateBadgeProps {
  dueDate: string | null;
}

const urgencyClasses = {
  overdue:
    "bg-red-100 text-red-800 border border-red-300 animate-pulse-urgency",
  today: "bg-red-100 text-red-800 border border-red-300",
  soon: "bg-amber-100 text-amber-800 border border-amber-300",
  normal: "bg-green-100 text-green-800 border border-green-300",
};

export function DueDateBadge({ dueDate }: DueDateBadgeProps) {
  if (!dueDate) return null;

  const { label, urgency } = getRelativeDate(dueDate);

  return (
    <span
      data-testid="due-date-badge"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${urgencyClasses[urgency]}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}
