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
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  archived: boolean;
}

export interface Log {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
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
  last30Days: { date: string; completed: boolean }[];
}
