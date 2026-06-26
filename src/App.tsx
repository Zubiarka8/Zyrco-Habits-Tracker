import { createHashRouter, RouterProvider } from "react-router-dom";
import { PremiumProvider } from "./context/PremiumContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Today } from "./pages/Today";
import { Habits } from "./pages/Habits";
import { Todos } from "./pages/Todos";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { Auth } from "./pages/Auth";

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

  if (loading) return null;

  if (!user) return <Auth />;

  return (
    <PremiumProvider>
      <RouterProvider router={router} />
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
