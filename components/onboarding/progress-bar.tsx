/**
 * How far through a step, drawn only when the total is known.
 *
 * A step whose length the service decides as it goes has no total to draw
 * against, and inventing one would be a promise this product does not make.
 * That is not enforced here: the caller only gets a position when there is one
 * to give.
 *
 * Thick and fully rounded. A hairline track reads as a loading indicator,
 * something happening to you; this reads as a thing you are filling.
 *
 * The fill is the same near-black-on-light face every primary control uses,
 * not the accent. The accent belongs to what the product measures about you,
 * and spending it on a progress bar is spending it on the one thing here that
 * means nothing.
 *
 * Sized by width and not by transform: rounding on a scaled child comes out
 * squashed flat by the scale.
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
  const done = Math.min(Math.max(position / total, 0), 1);

  return (
    <div
      data-slot="onboarding-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={position}
      aria-label={label}
      className="bg-surface-tertiary relative h-2 w-full rounded-full"
    >
      <div
        className="bg-cta-face absolute inset-y-0 left-0 rounded-full transition-[width] duration-(--duration-press-out) ease-(--ease-standard)"
        style={{ width: `${done * 100}%` }}
      />
    </div>
  );
}
