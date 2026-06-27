/** Shimmer placeholder for a single habit row in Today view. */
export function SkeletonHabitRow() {
  return (
    <div className="habit-row skeleton-row" aria-hidden="true">
      <div className="habit-color-bar skeleton-slab" style={{ width: 4 }} />
      <div className="skeleton-circle" />
      <div className="skeleton-body">
        <div className="skeleton-slab skeleton-slab--wide" />
        <div className="skeleton-slab skeleton-slab--narrow" />
      </div>
    </div>
  );
}

/** Shimmer placeholder for a habit card in the Habits list. */
export function SkeletonHabitCard() {
  return (
    <div className="habit-card" aria-hidden="true">
      <div className="habit-card-accent skeleton-slab" />
      <div className="habit-card-body">
        <div className="skeleton-icon" />
        <div className="skeleton-body">
          <div className="skeleton-slab skeleton-slab--wide" />
          <div className="skeleton-slab skeleton-slab--narrow" />
        </div>
      </div>
    </div>
  );
}
