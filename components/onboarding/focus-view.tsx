"use client";

import { TurnText } from "@/components/talkeo/turn-text";
import { VIEW_SWITCH_MS } from "@/lib/onboarding/motion";
import type { FocusShows } from "@/lib/onboarding/view-machine";
import type { TurnPlayback } from "@/lib/talkeo/use-turn-playback";

import { TALKEO_BODY } from "./bubble";

/**
 * One thing at a time, and it means one.
 *
 * Talkeo says something, finishes saying it, and then the surface takes its
 * place. The two are never both up: the surface is one of the ways to ANSWER
 * what was just asked, so having it beside the question turns a conversation
 * into a form with a caption.
 *
 * ⚠ They used to be siblings in a column, and both showed. What that produced —
 * measured in a browser on 9/sep — was the surface arriving first and the words
 * eight seconds later, underneath it. It also forced the surfaces to drop their
 * titles, because the title IS the question and the question was already on
 * screen; with the two separated, the title comes back.
 *
 * The cross-fade is deliberately the plainest thing that works. The focus view's
 * animation is its own piece of work and is not this one.
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
  // Pulled here out of the chat, the turn is already behind them on the other
  // view; repeating it would be the same words twice on two screens.
  const saying =
    shows === "the turn" && !surface && playback.lines.length > 0;

  return (
    <div
      data-slot="focus-view"
      data-shows={surface ? "surface" : saying ? "turn" : "nothing"}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10"
    >
      <div
        key={surface ? "surface" : "turn"}
        className="animate-[message-in] w-full ease-(--ease-standard)"
        style={{ animationDuration: `${VIEW_SWITCH_MS}ms` }}
      >
        {surface ?? (
          <div className="mx-auto w-full max-w-xl">
            {saying ? (
              <TurnText
                lines={playback.lines}
                revealedWords={playback.revealedWords}
                className={`${TALKEO_BODY} text-[24px] leading-[1.5]`}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
