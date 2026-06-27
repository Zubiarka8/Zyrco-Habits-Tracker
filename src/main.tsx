import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import "./index.css";
import App from "./App";
import { applyAccent } from "./utils/accent";

const saved = localStorage.getItem("zyrco-theme") ?? "system";
const root = document.documentElement;
if (saved === "dark") {
  root.setAttribute("data-theme", "dark");
} else if (saved === "light") {
  root.setAttribute("data-theme", "light");
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", prefersDark ? "dark" : "light");
}

applyAccent(localStorage.getItem("zyrco-accent") ?? "indigo");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
