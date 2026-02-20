import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getRelativeDate } from "./date-utils";

const FIXED_NOW = new Date(2026, 2, 10);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getRelativeDate", () => {
  it("returns today urgency and label for today's date", () => {
    const result = getRelativeDate("2026-03-10");
    expect(result.label).toBe("today");
    expect(result.urgency).toBe("today");
  });

  it("returns soon urgency for tomorrow", () => {
    const result = getRelativeDate("2026-03-11");
    expect(result.label).toBe("tomorrow");
    expect(result.urgency).toBe("soon");
  });

  it("returns soon urgency for 2 days from now", () => {
    const result = getRelativeDate("2026-03-12");
    expect(result.label).toBe("in 2 days");
    expect(result.urgency).toBe("soon");
  });

  it("returns soon urgency for 3 days from now (amber boundary)", () => {
    const result = getRelativeDate("2026-03-13");
    expect(result.label).toBe("in 3 days");
    expect(result.urgency).toBe("soon");
  });

  it("returns normal urgency for 4 days from now (green boundary)", () => {
    const result = getRelativeDate("2026-03-14");
    expect(result.urgency).toBe("normal");
  });

  it("returns normal urgency for 7 days from now", () => {
    const result = getRelativeDate("2026-03-17");
    expect(result.label).toBe("in 7 days");
    expect(result.urgency).toBe("normal");
  });

  it("returns weeks label for 14+ days from now", () => {
    const result = getRelativeDate("2026-03-24");
    expect(result.label).toBe("in 2 weeks");
    expect(result.urgency).toBe("normal");
  });

  it("returns overdue urgency for yesterday", () => {
    const result = getRelativeDate("2026-03-09");
    expect(result.label).toBe("yesterday");
    expect(result.urgency).toBe("overdue");
  });

  it("returns overdue urgency for 2 days ago", () => {
    const result = getRelativeDate("2026-03-08");
    expect(result.label).toBe("2 days ago");
    expect(result.urgency).toBe("overdue");
  });

  it("returns overdue urgency for 7 days ago", () => {
    const result = getRelativeDate("2026-03-03");
    expect(result.label).toBe("7 days ago");
    expect(result.urgency).toBe("overdue");
  });

  it("returns weeks-ago label for 14+ days overdue", () => {
    const result = getRelativeDate("2026-02-24");
    expect(result.label).toBe("2 weeks ago");
    expect(result.urgency).toBe("overdue");
  });

  it("returns safe fallback for invalid date string (does not throw)", () => {
    const result = getRelativeDate("not-a-date");
    expect(result.label).toBe("not-a-date");
    expect(result.urgency).toBe("normal");
  });
});
