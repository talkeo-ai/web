import { ProgressBar } from "@/components/onboarding/progress-bar";

/**
 * The top of the conversation: how far through it you are, and nothing else.
 *
 * The same 44 as the panel's header, so the two are one line across the screen,
 * and the same measure as the composer at the other end, so the two things that
 * frame the conversation share its width.
 *
 * Every attempt at making this line do more work — greeting, encouraging,
 * saying how long is left in words — read as the interface talking over the
 * assistant, who is right below and is the one meant to be doing that.
 */
export function ChatHeader({
  position,
  total,
  label,
}: {
  position: number;
  total: number;
  label: string;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center">
      <div className="mx-auto w-full max-w-3xl pr-4 pl-6">
        <ProgressBar position={position} total={total} label={label} />
      </div>
    </header>
  );
}
