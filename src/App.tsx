import { useState, useEffect } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { PremiumProvider } from "./context/PremiumContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Today } from "./pages/Today";
import { Habits } from "./pages/Habits";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { HabitDetail } from "./pages/HabitDetail";
import { Calendar } from "./pages/Calendar";
import { Auth } from "./pages/Auth";
import { Onboarding } from "./components/Onboarding";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WeeklyDigest } from "./components/WeeklyDigest";
import type { HabitTemplate } from "./data/habitTemplates";
import { insertHabit, fetchHabits, fetchAllLogs } from "./db/database";
import { format } from "date-fns";

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: "habits", element: <Habits /> },
      { path: "habits/:id", element: <HabitDetail /> },
      { path: "stats", element: <Stats /> },
      { path: "calendar", element: <Calendar /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

/** Returns true if today is Monday and the digest wasn't already shown this week. */
function shouldShowWeeklyDigest(): boolean {
  const today = new Date();
  if (today.getDay() !== 1) return false; // only on Mondays
  const lastDigest = localStorage.getItem("zyrco-last-digest");
  const thisWeekMonday = format(today, "yyyy-MM-dd");
  return lastDigest !== thisWeekMonday;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("zyrco-onboarding-done")
  );
  const [showDigest, setShowDigest] = useState(false);
  const [digestData, setDigestData] = useState<{ habits: import("./types").Habit[]; logs: import("./types").Log[] } | null>(null);

  // Weekly digest: show on Monday if not already shown this week
  useEffect(() => {
    if (!user || showOnboarding) return;
    if (!shouldShowWeeklyDigest()) return;

    Promise.all([fetchHabits(false), fetchAllLogs()]).then(([habits, logs]) => {
      if (habits.length === 0) return;
      setDigestData({ habits, logs });
      setShowDigest(true);
      localStorage.setItem("zyrco-last-digest", format(new Date(), "yyyy-MM-dd"));
    }).catch((err) => {
      console.error("WeeklyDigest data load failed:", err);
    });
  }, [user, showOnboarding]);

  if (loading) return null;

  if (!user) return <Auth />;

  const handleOnboardingComplete = async (template: HabitTemplate | null) => {
    localStorage.setItem("zyrco-onboarding-done", "1");
    if (template) {
      try {
        const habit = await insertHabit({
          name: template.name,
          description: template.description ?? null,
          category_id: null,
          color: template.color,
          icon: template.icon,
          frequency: template.frequency,
          custom_type: template.custom_type ?? null,
          target_days: template.target_days ?? null,
          interval_days: template.interval_days ?? null,
          start_date: null,
          end_date: null,
          type: template.type,
          session: template.session,
          completion_type: template.completion_type,
          completion_target: template.completion_target ?? null,
          completion_unit: template.completion_unit ?? null,
          reminder_enabled: false,
          reminder_time: null,
          time_start: null,
          time_end: null,
          paused_until: null,
        });

        // Highlight the new habit in Today view so the user can see it
        localStorage.setItem("zyrco-highlight-habit", habit.id);
        window.dispatchEvent(new CustomEvent("zyrco:log-changed"));
      } catch (err) {
        console.error("Onboarding insertHabit failed:", err);
      }
    }
    setShowOnboarding(false);
  };

  return (
    <PremiumProvider>
      <ToastProvider>
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        {showDigest && digestData && (
          <WeeklyDigest
            habits={digestData.habits}
            logs={digestData.logs}
            onClose={() => setShowDigest(false)}
          />
        )}
        <RouterProvider router={router} />
      </ToastProvider>
    </PremiumProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
