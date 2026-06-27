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
  /** True when streak is alive via grace day (recent miss but not yet broken). */
  graceDayActive?: boolean;
}

export function StreakBadge({ streak, atRisk, graceDayActive }: StreakBadgeProps) {
  if (streak === 0) return null;

  const milestone = getStreakMilestone(streak);
  const intensity = atRisk
    ? "streak-at-risk"
    : streak >= 30
    ? "streak-gold"
    : streak >= 7
    ? "streak-orange"
    : "streak-default";

  const title = atRisk
    ? "Streak at risk!"
    : graceDayActive
    ? "Streak active via grace day. Complete today to keep it!"
    : undefined;

  return (
    <span className={`streak-badge ${intensity} ${milestone ? "streak-milestone" : ""}`} title={title}>
      <Flame size={12} />
      {streak}
      {graceDayActive && !atRisk && <span className="grace-day-icon">⚡</span>}
      {milestone === streak && (
        <span className="milestone-crown" title={`${milestone}-day milestone!`}>🏆</span>
      )}
    </span>
  );
}
