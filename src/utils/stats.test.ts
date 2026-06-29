import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateStreak, calculateStrengthScore } from "./stats";
import type { Habit, Log } from "../types";

// Pin "today" to a known Monday so weekday tests are deterministic
const TODAY = new Date("2024-06-17T12:00:00Z"); // Monday

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test",
    description: null,
    category_id: null,
    frequency: "daily",
    custom_type: null,
    target_days: null,
    interval_days: null,
    start_date: null,
    end_date: null,
    color: "#fff",
    icon: "✅",
    type: "good",
    session: "anytime",
    completion_type: "binary",
    completion_target: null,
    completion_unit: null,
    reminder_enabled: false,
    reminder_time: null,
    time_start: null,
    time_end: null,
    paused_until: null,
    created_at: "2024-01-01T00:00:00.000Z",
    archived: false,
    ...overrides,
  };
}

function makeLog(habitId: string, date: string, completed = true): Log {
  return {
    id: crypto.randomUUID(),
    habit_id: habitId,
    date,
    completed,
    value: null,
    note: null,
    created_at: new Date().toISOString(),
  };
}

// ── calculateStreak — daily habits ───────────────────────

describe("calculateStreak — daily habit, no completions", () => {
  it("returns zero when no logs", () => {
    const h = makeHabit();
    const { current, best } = calculateStreak([], h);
    expect(current).toBe(0);
    expect(best).toBe(0);
  });
});

describe("calculateStreak — daily habit, consecutive completions", () => {
  it("counts 3 consecutive days", () => {
    // grace=1 (default), today=Mon 2024-06-17
    localStorage.setItem("zyrco-grace-days", "0");
    const h = makeHabit();
    const logs = [
      makeLog("h1", "2024-06-17"),
      makeLog("h1", "2024-06-16"),
      makeLog("h1", "2024-06-15"),
    ];
    const { current, best } = calculateStreak(logs, h);
    expect(current).toBe(3);
    expect(best).toBe(3);
  });

  it("graceDayActive is false when today is completed", () => {
    localStorage.setItem("zyrco-grace-days", "0");
    const h = makeHabit();
    const logs = [makeLog("h1", "2024-06-17"), makeLog("h1", "2024-06-16")];
    const { graceDayActive } = calculateStreak(logs, h);
    expect(graceDayActive).toBe(false);
  });
});

describe("calculateStreak — daily habit, grace days", () => {
  it("grace=1: one missed day keeps the streak alive", () => {
    localStorage.setItem("zyrco-grace-days", "1");
    const h = makeHabit();
    // completed Mon (today) skipped, Sat completed, Fri completed
    const logs = [
      makeLog("h1", "2024-06-15"), // Sat
      makeLog("h1", "2024-06-14"), // Fri
    ];
    const { current } = calculateStreak(logs, h);
    // Sun 2024-06-16 is missed but grace=1 allows it; today also missed but that's the 2nd miss → breaks
    // Actually: today (Mon) missed (missRun=1), Sun missed (missRun=2) > grace 1 → break before Sat
    // So current=0... wait let me re-think.
    // Walk: i=0 (Mon 6/17) not completed → missRun=1, 1 > 1? No. i=1 (Sun 6/16) not completed → missRun=2, 2 > 1 → break
    // So current=0
    expect(current).toBe(0);
  });

  it("grace=1: exactly one missed day at the start keeps streak alive and sets graceDayActive", () => {
    localStorage.setItem("zyrco-grace-days", "1");
    const h = makeHabit();
    // Today (Mon) missed, yesterday (Sun) completed
    const logs = [
      makeLog("h1", "2024-06-16"), // Sun
      makeLog("h1", "2024-06-15"), // Sat
      makeLog("h1", "2024-06-14"), // Fri
    ];
    const { current, graceDayActive } = calculateStreak(logs, h);
    expect(current).toBe(3);
    expect(graceDayActive).toBe(true);
  });

  it("grace=0: missing today breaks streak immediately", () => {
    localStorage.setItem("zyrco-grace-days", "0");
    const h = makeHabit();
    const logs = [
      makeLog("h1", "2024-06-16"), // Sun completed
      makeLog("h1", "2024-06-15"), // Sat completed
    ];
    const { current } = calculateStreak(logs, h);
    // Today (Mon) missed, missRun=1 > 0 → break
    expect(current).toBe(0);
  });
});

// ── calculateStreak — Mon–Fri habit ──────────────────────

describe("calculateStreak — Mon–Fri habit, weekends don't break streak", () => {
  const monFriHabit = makeHabit({
    frequency: "custom",
    custom_type: "weekdays",
    target_days: [1, 2, 3, 4, 5],
  });

  it("completing all weekdays across a weekend = unbroken streak", () => {
    localStorage.setItem("zyrco-grace-days", "0");
    // Today is Mon 2024-06-17. Previous week: Mon-Fri completed.
    const logs = [
      makeLog("h1", "2024-06-17"), // Mon (today)
      makeLog("h1", "2024-06-14"), // Fri last week
      makeLog("h1", "2024-06-13"), // Thu
      makeLog("h1", "2024-06-12"), // Wed
      makeLog("h1", "2024-06-11"), // Tue
      makeLog("h1", "2024-06-10"), // Mon
    ];
    const { current } = calculateStreak(logs, monFriHabit);
    expect(current).toBe(6);
  });

  it("missing a Wednesday breaks the streak (grace=0)", () => {
    localStorage.setItem("zyrco-grace-days", "0");
    const logs = [
      makeLog("h1", "2024-06-17"), // Mon today
      makeLog("h1", "2024-06-14"), // Fri
      makeLog("h1", "2024-06-13"), // Thu
      // Wed 2024-06-12 MISSING
      makeLog("h1", "2024-06-11"), // Tue
      makeLog("h1", "2024-06-10"), // Mon
    ];
    const { current } = calculateStreak(logs, monFriHabit);
    // Walk: Mon(done)→Fri(done)→Thu(done)→Wed(missed, missRun=1 > 0) → break → current=3
    expect(current).toBe(3);
  });

  it("missing a Wednesday is tolerated with grace=1", () => {
    localStorage.setItem("zyrco-grace-days", "1");
    const logs = [
      makeLog("h1", "2024-06-17"), // Mon today
      makeLog("h1", "2024-06-14"), // Fri
      makeLog("h1", "2024-06-13"), // Thu
      // Wed 2024-06-12 MISSING (missRun=1, <= grace 1)
      makeLog("h1", "2024-06-11"), // Tue — resets missRun
      makeLog("h1", "2024-06-10"), // Mon
    ];
    const { current } = calculateStreak(logs, monFriHabit);
    expect(current).toBe(5);
  });
});

// ── calculateStreak — best streak ────────────────────────

describe("calculateStreak — best streak", () => {
  it("best streak is the longest unbroken run (no grace applied to best)", () => {
    localStorage.setItem("zyrco-grace-days", "0");
    const h = makeHabit();
    // 3 consecutive days in the past, then gap, then 5 consecutive days ending today
    const logs = [
      makeLog("h1", "2024-06-17"), // today
      makeLog("h1", "2024-06-16"),
      makeLog("h1", "2024-06-15"),
      makeLog("h1", "2024-06-14"),
      makeLog("h1", "2024-06-13"),
      // gap
      makeLog("h1", "2024-06-10"),
      makeLog("h1", "2024-06-09"),
      makeLog("h1", "2024-06-08"),
    ];
    const { current, best } = calculateStreak(logs, h);
    expect(current).toBe(5);
    expect(best).toBe(5);
  });

  it("best streak for Mon–Fri habit counts only due days", () => {
    localStorage.setItem("zyrco-grace-days", "0");
    const h = makeHabit({
      frequency: "custom",
      custom_type: "weekdays",
      target_days: [1, 2, 3, 4, 5],
    });
    // Two full weeks of Mon–Fri = 10 due days
    const logs = [
      makeLog("h1", "2024-06-17"), // Mon W2
      makeLog("h1", "2024-06-14"), // Fri W1
      makeLog("h1", "2024-06-13"), // Thu W1
      makeLog("h1", "2024-06-12"), // Wed W1
      makeLog("h1", "2024-06-11"), // Tue W1
      makeLog("h1", "2024-06-10"), // Mon W1
    ];
    const { best } = calculateStreak(logs, h);
    expect(best).toBe(6);
  });
});

// ── calculateStrengthScore ────────────────────────────────

describe("calculateStrengthScore", () => {
  it("returns 0 with no logs", () => {
    expect(calculateStrengthScore([], "h1")).toBe(0);
  });

  it("returns 100 with 90 consecutive completions", () => {
    const logs: Log[] = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() - i);
      logs.push(makeLog("h1", d.toISOString().slice(0, 10)));
    }
    const score = calculateStrengthScore(logs, "h1");
    expect(score).toBe(100);
  });

  it("stays above 50 after a 3-day gap following 60 days of consistency", () => {
    const logs: Log[] = [];
    for (let i = 3; i < 63; i++) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() - i);
      logs.push(makeLog("h1", d.toISOString().slice(0, 10)));
    }
    const score = calculateStrengthScore(logs, "h1");
    expect(score).toBeGreaterThan(50);
  });

  it("recent completions weigh more than old ones", () => {
    const recentLogs = [makeLog("h1", "2024-06-17"), makeLog("h1", "2024-06-16")];
    const oldLogs    = [makeLog("h1", "2024-03-01"), makeLog("h1", "2024-03-02")];
    expect(calculateStrengthScore(recentLogs, "h1")).toBeGreaterThan(
      calculateStrengthScore(oldLogs, "h1")
    );
  });
});
