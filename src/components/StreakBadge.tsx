import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  /** True when today, habit not yet completed — warns the streak will break. */
  atRisk?: boolean;
}

export function StreakBadge({ streak, atRisk }: StreakBadgeProps) {
  if (streak === 0) return null;

  const intensity = atRisk
    ? "streak-at-risk"
    : streak >= 30
    ? "streak-gold"
    : streak >= 7
    ? "streak-orange"
    : "streak-default";

  return (
    <span className={`streak-badge ${intensity}`} title={atRisk ? "Streak at risk!" : undefined}>
      <Flame size={12} />
      {streak}
    </span>
  );
}
