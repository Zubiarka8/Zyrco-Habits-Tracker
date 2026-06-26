import { createHashRouter, RouterProvider } from "react-router-dom";
import { PremiumProvider } from "./context/PremiumContext";
import { Layout } from "./components/Layout";
import { Today } from "./pages/Today";
import { Habits } from "./pages/Habits";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: "habits", element: <Habits /> },
      { path: "stats", element: <Stats /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

export default function App() {
  return (
    <PremiumProvider>
      <RouterProvider router={router} />
    </PremiumProvider>
  );
}
