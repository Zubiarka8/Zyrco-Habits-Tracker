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
  target_days: number[] | null;
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

export interface HabitStats {
  habitId: string;
  streak: number;
  bestStreak: number;
  totalCompleted: number;
  completionRate: number;
  last30Days: { date: string; completed: boolean }[];
}
