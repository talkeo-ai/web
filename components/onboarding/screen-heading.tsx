/** The question a screen asks, and the one line that qualifies it. */
export function ScreenHeading({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-semibold tracking-[-0.02em]">
        {title}
      </h1>
      {hint ? <p className="text-text-secondary text-sm">{hint}</p> : null}
    </div>
  );
}
