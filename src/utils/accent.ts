export interface AccentPalette {
  id: string;
  label: string;
  primary: string;
  hover: string;
  muted: string;
}

export const ACCENT_PALETTES: AccentPalette[] = [
  { id: "indigo",  label: "Indigo",  primary: "#6366f1", hover: "#4f46e5", muted: "#6366f122" },
  { id: "violet",  label: "Violet",  primary: "#8b5cf6", hover: "#7c3aed", muted: "#8b5cf622" },
  { id: "emerald", label: "Emerald", primary: "#10b981", hover: "#059669", muted: "#10b98122" },
  { id: "rose",    label: "Rose",    primary: "#f43f5e", hover: "#e11d48", muted: "#f43f5e22" },
  { id: "amber",   label: "Amber",   primary: "#f59e0b", hover: "#d97706", muted: "#f59e0b22" },
  { id: "sky",     label: "Sky",     primary: "#0ea5e9", hover: "#0284c7", muted: "#0ea5e922" },
];

export function applyAccent(id: string): void {
  const palette = ACCENT_PALETTES.find((p) => p.id === id) ?? ACCENT_PALETTES[0];
  const root = document.documentElement;
  root.style.setProperty("--color-primary", palette.primary);
  root.style.setProperty("--color-primary-hover", palette.hover);
  root.style.setProperty("--color-primary-muted", palette.muted);
}
