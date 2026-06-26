import { useEffect } from "react";
import { format } from "date-fns";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { Habit, Log } from "../types";

export function useReminders(habits: Habit[], todayLogs: Log[]) {
  useEffect(() => {
    const enabledHabits = habits.filter(
      (h) => h.reminder_enabled && h.reminder_time && !h.archived
    );
    if (enabledHabits.length === 0) return;

    const check = async () => {
      const granted = await isPermissionGranted();
      if (!granted) {
        const result = await requestPermission();
        if (result !== "granted") return;
      }

      const now = new Date();
      const currentTime = format(now, "HH:mm");
      const today = format(now, "yyyy-MM-dd");

      for (const habit of enabledHabits) {
        if (habit.reminder_time !== currentTime) continue;

        const alreadyFiredKey = `zyrco-reminder-${habit.id}-${today}`;
        if (localStorage.getItem(alreadyFiredKey)) continue;

        const alreadyDone = todayLogs.some(
          (l) => l.habit_id === habit.id && l.completed
        );
        if (alreadyDone) continue;

        await sendNotification({
          title: "Zyrco",
          body:
            habit.type === "bad"
              ? `Remember to avoid: ${habit.name}`
              : `Time for: ${habit.name}`,
        });

        localStorage.setItem(alreadyFiredKey, "1");
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [habits, todayLogs]);
}
