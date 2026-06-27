import { Flame } from "lucide-react";

export const STREAK_MILESTONES = [7, 21, 30, 66, 100];

/** Returns the highest milestone the streak has reached, or null. */
export function getStreakMilestone(streak: number): number | null {
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= STREAK_MILESTONES[i]) return STREAK_MILESTONES[i];
  }
  return null;
}

interface StreakBadgeProps {
  streak: number;
  /** True when today, habit not yet completed — warns the streak will break. */
  atRisk?: boolean;
}

export function StreakBadge({ streak, atRisk }: StreakBadgeProps) {
  if (streak === 0) return null;

  const milestone = getStreakMilestone(streak);
  const intensity = atRisk
    ? "streak-at-risk"
    : streak >= 30
    ? "streak-gold"
    : streak >= 7
    ? "streak-orange"
    : "streak-default";

  return (
    <span className={`streak-badge ${intensity} ${milestone ? "streak-milestone" : ""}`} title={atRisk ? "Streak at risk!" : undefined}>
      <Flame size={12} />
      {streak}
      {milestone === streak && (
        <span className="milestone-crown" title={`${milestone}-day milestone!`}>🏆</span>
      )}
    </span>
  );
}
