export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  frequency: "daily" | "weekly" | "custom";
  /** Discriminates the three custom schedule sub-types. Null on legacy habits (treated as "weekdays"). */
  custom_type: "weekdays" | "month_days" | "interval" | null;
  /** weekdays (0-6) or month-day numbers (1-31) depending on custom_type */
  target_days: number[] | null;
  /** For custom_type "interval": repeat every N calendar days */
  interval_days: number | null;
  /** yyyy-MM-dd: earliest date this habit is due. Also the day-0 reference for interval habits. */
  start_date: string | null;
  /** yyyy-MM-dd: last date this habit is due (null = no end) */
  end_date: string | null;
  color: string;
  icon: string;
  type: "good" | "bad" | "normal";
  /** Primary session — first element of sessions[], kept for display/grouping compat */
  session: "morning" | "afternoon" | "evening" | "anytime";
  /** All sessions this habit should appear in. Optional on creation (defaults to [session]). */
  sessions?: string[];
  /** P-04: how completion is tracked for this habit */
  completion_type: "binary" | "numeric" | "timer";
  /** P-04: target quantity (e.g. 8 for "8 glasses of water") */
  completion_target: number | null;
  /** P-04: unit label for numeric/timer (e.g. "glasses", "minutes") */
  completion_unit: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  /** HH:MM — optional start time shown on the habit row */
  time_start: string | null;
  /** HH:MM — optional end time; only meaningful when time_start is set */
  time_end: string | null;
  /** R-13: yyyy-MM-dd after which the habit resumes. Null = not paused. */
  paused_until: string | null;
  created_at: string;
  archived: boolean;
}

export interface Log {
  id: string;
  habit_id: string;
  date: string;
  /** Session instance for multi-session habits; '' for legacy single-session logs */
  session: string;
  completed: boolean;
  /** P-04: numeric value logged (e.g. 6 glasses, 25 minutes) */
  value: number | null;
  note: string | null;
  created_at: string;
}

export interface HabitWithMeta extends Habit {
  streak: number;
  completedToday: boolean;
  category: Category | null;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: "none" | "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
}

// ── Subscription / Monetization ──────────────────────────

export type PlanType =
  | "free"
  | "premium_monthly"
  | "premium_yearly"
  | "premium_lifetime";

export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  renewed_at: string | null;
  payment_provider: "revenuecat" | "stripe" | null;
  payment_reference: string | null;
  streak_shields_used: number;
  streak_shields_reset_at: string | null;
}

/** Limits per plan — free values used when MONETIZATION_ACTIVE = true */
export const PLAN_LIMITS = {
  free: {
    maxHabits: 10,
    statsDays: 30,
    remindersPerHabit: 1,
    streakShieldsPerMonth: 0,
  },
  premium_monthly: {
    maxHabits: Infinity,
    statsDays: Infinity,
    remindersPerHabit: Infinity,
    streakShieldsPerMonth: 1,
  },
  premium_yearly: {
    maxHabits: Infinity,
    statsDays: Infinity,
    remindersPerHabit: Infinity,
    streakShieldsPerMonth: 3,
  },
  premium_lifetime: {
    maxHabits: Infinity,
    statsDays: Infinity,
    remindersPerHabit: Infinity,
    streakShieldsPerMonth: Infinity,
  },
} as const;

export interface HabitStats {
  habitId: string;
  streak: number;
  bestStreak: number;
  totalCompleted: number;
  completionRate: number;
  /** P-01: 0–100 EMA-based strength score — decays on misses, slow to reset */
  strengthScore: number;
  last30Days: { date: string; completed: boolean }[];
  /** True when the streak is being held by a grace day (today or yesterday not completed) */
  graceDayActive: boolean;
}
