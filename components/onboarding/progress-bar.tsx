/**
 * How far through a step, drawn only when the total is known.
 *
 * A step whose length the service decides as it goes has no total to draw
 * against, and inventing one would be a promise this product does not make.
 * That is not enforced here: the caller only gets a position when there is one
 * to give.
 *
 * The fill moves by transform rather than width, so nothing reflows.
 */
export function ProgressBar({
  position,
  total,
  label,
}: {
  position: number;
  total: number;
  label: string;
}) {
  return (
    <div
      data-slot="onboarding-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={position}
      aria-label={label}
      className="bg-surface-tertiary h-1.5 w-full overflow-hidden rounded-full"
    >
      <div
        className="bg-accent-text h-full w-full origin-left rounded-full transition-transform duration-(--duration-press-out) ease-(--ease-standard)"
        style={{ transform: `scaleX(${position / total})` }}
      />
    </div>
  );
}
