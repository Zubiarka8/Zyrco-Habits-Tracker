import { useState, useEffect, useCallback } from "react";
import type { Subscription, PlanType } from "../types";
import { getSubscription, expireSubscription } from "../db/database";

// [TEMPORAL] Cambiar a true para activar la monetización real.
// Cuando se active:
//   1. Cambiar MONETIZATION_ACTIVE = true
//   2. Buscar todos los comentarios [FUTURO] y activar los límites
//   3. Integrar RevenueCat / Stripe para gestión de pagos
const MONETIZATION_ACTIVE = false;

// ── Lógica pura (sin React) ───────────────────────────────

export function checkIsPremium(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === "expired") return false;
  if (sub.status === "cancelled" && sub.expires_at) {
    return new Date(sub.expires_at) > new Date();
  }
  if (sub.status !== "active" && sub.status !== "trial") return false;
  if (sub.plan_type === "free") return false;
  if (sub.expires_at === null) return true; // lifetime
  return new Date(sub.expires_at) > new Date();
}

export function checkIsLifetime(sub: Subscription | null): boolean {
  return (
    sub?.plan_type === "premium_lifetime" &&
    (sub?.status === "active" || sub?.status === "trial")
  );
}

export function getShieldsRemaining(sub: Subscription | null): number {
  if (!sub) return 0;
  const plan = sub.plan_type;

  // Monthly reset check
  const now = new Date();
  const resetDate = sub.streak_shields_reset_at
    ? new Date(sub.streak_shields_reset_at)
    : null;
  const isNewMonth =
    !resetDate ||
    resetDate.getMonth() !== now.getMonth() ||
    resetDate.getFullYear() !== now.getFullYear();

  const used = isNewMonth ? 0 : sub.streak_shields_used;

  if (plan === "free") return 0;
  if (plan === "premium_monthly") return Math.max(0, 1 - used);
  if (plan === "premium_yearly") return Math.max(0, 3 - used);
  if (plan === "premium_lifetime") return Infinity;
  return 0;
}

// ── Hook ─────────────────────────────────────────────────

export interface PremiumState {
  // [TEMPORAL] isPremium = true para todos mientras MONETIZATION_ACTIVE = false
  isPremium: boolean;
  // [TEMPORAL] isLifetime = false para todos mientras MONETIZATION_ACTIVE = false
  isLifetime: boolean;
  plan: PlanType;
  subscription: Subscription | null;
  streakShieldsRemaining: number;
  loading: boolean;
  reload: () => Promise<void>;
}

export function usePremium(): PremiumState {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const sub = await getSubscription();

    // Auto-expire if past expiry date
    if (
      sub &&
      sub.status === "active" &&
      sub.expires_at &&
      new Date(sub.expires_at) < new Date()
    ) {
      await expireSubscription();
      const refreshed = await getSubscription();
      setSubscription(refreshed);
    } else {
      setSubscription(sub);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // [TEMPORAL] Cuando MONETIZATION_ACTIVE = false todos son premium
  const isPremium = MONETIZATION_ACTIVE ? checkIsPremium(subscription) : true;
  const isLifetime = MONETIZATION_ACTIVE ? checkIsLifetime(subscription) : false;
  const plan: PlanType = subscription?.plan_type ?? "free";
  const streakShieldsRemaining = MONETIZATION_ACTIVE
    ? getShieldsRemaining(subscription)
    : Infinity; // [TEMPORAL] sin límite mientras monetización no activa

  return { isPremium, isLifetime, plan, subscription, streakShieldsRemaining, loading, reload: load };
}
