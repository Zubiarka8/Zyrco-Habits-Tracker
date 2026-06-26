import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;

  const intensity =
    streak >= 30 ? "streak-gold" : streak >= 7 ? "streak-orange" : "streak-default";

  return (
    <span className={`streak-badge ${intensity}`}>
      <Flame size={12} />
      {streak}
    </span>
  );
}
