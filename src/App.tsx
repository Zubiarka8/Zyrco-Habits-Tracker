import { useState } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { PremiumProvider } from "./context/PremiumContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Today } from "./pages/Today";
import { Habits } from "./pages/Habits";
import { Todos } from "./pages/Todos";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { Auth } from "./pages/Auth";
import { Onboarding } from "./components/Onboarding";
import type { HabitTemplate } from "./data/habitTemplates";
import { insertHabit } from "./db/database";

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: "habits", element: <Habits /> },
      { path: "todos", element: <Todos /> },
      { path: "stats", element: <Stats /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

function AppContent() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("zyrco-onboarding-done")
  );

  if (loading) return null;

  if (!user) return <Auth />;

  const handleOnboardingComplete = async (template: HabitTemplate | null) => {
    localStorage.setItem("zyrco-onboarding-done", "1");
    if (template) {
      try {
        await insertHabit({
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
        <RouterProvider router={router} />
      </ToastProvider>
    </PremiumProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
