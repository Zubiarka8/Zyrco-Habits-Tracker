import { describe, it, expect } from "vitest";
import { parseISO } from "date-fns";
import { isHabitDueOnDay } from "./schedule";
import type { Habit } from "../types";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test habit",
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

const d = (s: string) => parseISO(s + "T00:00:00");

describe("isHabitDueOnDay — archived", () => {
  it("never due when archived", () => {
    const h = makeHabit({ archived: true, frequency: "daily" });
    expect(isHabitDueOnDay(h, d("2024-06-15"))).toBe(false);
  });
});

describe("isHabitDueOnDay — date boundaries", () => {
  it("not due before start_date", () => {
    const h = makeHabit({ start_date: "2024-06-10" });
    expect(isHabitDueOnDay(h, d("2024-06-09"))).toBe(false);
  });

  it("due on start_date", () => {
    const h = makeHabit({ start_date: "2024-06-10" });
    expect(isHabitDueOnDay(h, d("2024-06-10"))).toBe(true);
  });

  it("not due after end_date", () => {
    const h = makeHabit({ end_date: "2024-06-20" });
    expect(isHabitDueOnDay(h, d("2024-06-21"))).toBe(false);
  });

  it("due on end_date", () => {
    const h = makeHabit({ end_date: "2024-06-20" });
    expect(isHabitDueOnDay(h, d("2024-06-20"))).toBe(true);
  });

  it("not due before created_at when no start_date set", () => {
    const h = makeHabit({ created_at: "2024-06-15T10:00:00.000Z", start_date: null });
    expect(isHabitDueOnDay(h, d("2024-06-14"))).toBe(false);
  });
});

describe("isHabitDueOnDay — daily", () => {
  it("is due every day", () => {
    const h = makeHabit({ frequency: "daily" });
    expect(isHabitDueOnDay(h, d("2024-06-17"))).toBe(true); // Mon
    expect(isHabitDueOnDay(h, d("2024-06-22"))).toBe(true); // Sat
  });
});

describe("isHabitDueOnDay — weekly", () => {
  it("due only on the chosen weekday (Wednesday = 3)", () => {
    const h = makeHabit({ frequency: "weekly", target_days: [3] });
    expect(isHabitDueOnDay(h, d("2024-06-19"))).toBe(true);  // Wed
    expect(isHabitDueOnDay(h, d("2024-06-18"))).toBe(false); // Tue
    expect(isHabitDueOnDay(h, d("2024-06-20"))).toBe(false); // Thu
  });

  it("falls back to Monday (1) when target_days is empty", () => {
    const h = makeHabit({ frequency: "weekly", target_days: [] });
    expect(isHabitDueOnDay(h, d("2024-06-17"))).toBe(true);  // Mon
    expect(isHabitDueOnDay(h, d("2024-06-18"))).toBe(false); // Tue
  });
});

describe("isHabitDueOnDay — custom weekdays", () => {
  it("due on Mon+Wed+Fri only", () => {
    const h = makeHabit({
      frequency: "custom",
      custom_type: "weekdays",
      target_days: [1, 3, 5], // Mon, Wed, Fri
    });
    expect(isHabitDueOnDay(h, d("2024-06-17"))).toBe(true);  // Mon
    expect(isHabitDueOnDay(h, d("2024-06-18"))).toBe(false); // Tue
    expect(isHabitDueOnDay(h, d("2024-06-19"))).toBe(true);  // Wed
    expect(isHabitDueOnDay(h, d("2024-06-21"))).toBe(true);  // Fri
    expect(isHabitDueOnDay(h, d("2024-06-22"))).toBe(false); // Sat
  });
});

describe("isHabitDueOnDay — custom month_days", () => {
  it("due on 1st and 15th of the month", () => {
    const h = makeHabit({
      frequency: "custom",
      custom_type: "month_days",
      target_days: [1, 15],
    });
    expect(isHabitDueOnDay(h, d("2024-06-01"))).toBe(true);
    expect(isHabitDueOnDay(h, d("2024-06-15"))).toBe(true);
    expect(isHabitDueOnDay(h, d("2024-06-10"))).toBe(false);
  });
});

describe("isHabitDueOnDay — custom interval", () => {
  it("every 3 days from start_date", () => {
    const h = makeHabit({
      frequency: "custom",
      custom_type: "interval",
      interval_days: 3,
      start_date: "2024-06-01",
    });
    expect(isHabitDueOnDay(h, d("2024-06-01"))).toBe(true);  // day 0
    expect(isHabitDueOnDay(h, d("2024-06-02"))).toBe(false); // day 1
    expect(isHabitDueOnDay(h, d("2024-06-04"))).toBe(true);  // day 3
    expect(isHabitDueOnDay(h, d("2024-06-07"))).toBe(true);  // day 6
    expect(isHabitDueOnDay(h, d("2024-06-05"))).toBe(false); // day 4
  });

  it("not due before the start reference", () => {
    const h = makeHabit({
      frequency: "custom",
      custom_type: "interval",
      interval_days: 2,
      start_date: "2024-06-10",
    });
    expect(isHabitDueOnDay(h, d("2024-06-09"))).toBe(false);
  });
});
