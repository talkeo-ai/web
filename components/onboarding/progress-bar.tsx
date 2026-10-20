/**
 * How far through the conversation, drawn only when the service says how far
 * there is to go.
 *
 * **It counts stages and not turns.** A stage runs one turn or three depending
 * on what somebody says, so a bar that counted turns would stall on a talkative
 * stage and jump on a quiet one — and the total would be unknowable, which is
 * how a progress bar ends up being a number somebody made up.
 *
 * Thick and fully rounded. A hairline reads as a loading indicator, something
 * happening to you; this reads as a thing you are filling.
 *
 * The fill is the same near-black-on-light face every primary control uses, not
 * the accent. The accent belongs to what the product measures about you, and
 * spending it here spends it on the one thing on this screen that means nothing
 * about you.
 *
 * ⚠ Sized by width and not by transform, which is the one place this screen
 * departs from the transform-and-opacity rule. A rounded child scaled on its x
 * axis comes out with its caps squashed flat, and the caps are the shape.
 */
export function ProgressBar({
  stage,
  total,
  label,
}: {
  stage: number;
  total: number;
  label: string;
}) {
  if (total <= 0) return null;
  const done = Math.min(Math.max(stage / total, 0), 1);

  return (
    <div
      data-slot="onboarding-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={stage}
      aria-label={label}
      className="bg-surface-tertiary relative h-2 w-full rounded-full"
    >
      <div
        data-slot="onboarding-progress-fill"
        className="bg-cta-face absolute inset-y-0 left-0 rounded-full transition-[width] duration-(--duration-press-out) ease-(--ease-standard)"
        style={{ width: `${done * 100}%` }}
      />
    </div>
  );
}
