export type Urgency = "overdue" | "today" | "soon" | "normal";

export interface RelativeDate {
  label: string;
  urgency: Urgency;
}

/**
 * Returns a relative time label and urgency level for a given ISO date string.
 * Parses the date in local timezone to avoid UTC off-by-one issues.
 * Returns a safe fallback if the input is invalid.
 */
/**
 * Converts a local Date to an ISO date string (YYYY-MM-DD) using local timezone.
 * Avoids the UTC off-by-one bug from Date.toISOString().
 */
export function dateToIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getRelativeDate(dateStr: string): RelativeDate {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return { label: dateStr, urgency: "normal" };
    }
    const [y, m, d] = parts;
    const due = new Date(y, m - 1, d);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: "today", urgency: "today" };
    }

    if (diffDays > 0) {
      const urgency: Urgency = diffDays <= 3 ? "soon" : "normal";
      if (diffDays === 1) return { label: "tomorrow", urgency };
      if (diffDays < 14) return { label: `in ${diffDays} days`, urgency };
      const weeks = Math.floor(diffDays / 7);
      return { label: `in ${weeks} week${weeks > 1 ? "s" : ""}`, urgency };
    }

    const absDays = Math.abs(diffDays);
    if (absDays === 1) return { label: "yesterday", urgency: "overdue" };
    if (absDays < 14)
      return { label: `${absDays} days ago`, urgency: "overdue" };
    const weeks = Math.floor(absDays / 7);
    return {
      label: `${weeks} week${weeks > 1 ? "s" : ""} ago`,
      urgency: "overdue",
    };
  } catch {
    return { label: dateStr, urgency: "normal" };
  }
}
