import { createContext, useContext, type ReactNode } from "react";
import { usePremium, type PremiumState } from "../hooks/usePremium";

const PremiumContext = createContext<PremiumState | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const premium = usePremium();
  return (
    <PremiumContext.Provider value={premium}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremiumContext(): PremiumState {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremiumContext must be used inside PremiumProvider");
  return ctx;
}
