"use client";

import { TurnText } from "@/components/talkeo/turn-text";
import type { FocusShows } from "@/lib/onboarding/view-machine";
import type { TurnPlayback } from "@/lib/talkeo/use-turn-playback";

import { TALKEO_BODY } from "./bubble";

/**
 * One thing at a time.
 *
 * The last turn, large, and the surface for the stage when there is one. It is
 * the default because it is the intuitive shape: an English app puts something
 * in front of you and you answer it.
 *
 * When it shows only the surface, that is because somebody was pulled here out
 * of the chat — where the turn is already in front of them. Repeating it would
 * be the same words twice on two screens.
 */
export function FocusView({
  shows,
  playback,
  surface,
}: {
  shows: FocusShows;
  playback: TurnPlayback;
  surface: React.ReactNode;
}) {
  return (
    <div
      data-slot="focus-view"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 px-6 py-10"
    >
      {shows === "the turn" && playback.lines.length > 0 ? (
        <div className="w-full max-w-xl">
          <TurnText
            lines={playback.lines}
            revealedWords={playback.revealedWords}
            className={`${TALKEO_BODY} text-[24px] leading-[1.5]`}
          />
        </div>
      ) : null}
      {surface}
    </div>
  );
}
