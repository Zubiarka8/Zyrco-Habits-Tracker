import type { ReactNode } from "react";
import { usePremiumContext } from "../context/PremiumContext";

interface PremiumGateProps {
  children: ReactNode;
  /** Which plans unlock this feature */
  requires?: "monthly" | "yearly" | "lifetime" | "any_premium";
  /** Rendered instead of children when user is not premium (future use) */
  fallback?: ReactNode;
}

/**
 * [TEMPORAL] Siempre renderiza children mientras MONETIZATION_ACTIVE = false.
 * Cuando se active la monetización:
 *   - Si el usuario no tiene el plan requerido, renderizar `fallback` (upsell CTA)
 *   - Nunca bloquear Today page ni el check-in de hábitos
 */
export function PremiumGate({ children, fallback }: PremiumGateProps) {
  const { isPremium } = usePremiumContext();

  // [TEMPORAL] isPremium siempre true → siempre renderiza children
  if (!isPremium && fallback) return <>{fallback}</>;
  return <>{children}</>;
}
