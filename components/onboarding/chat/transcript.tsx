"use client";

import type { RefObject } from "react";

import {
  Arriving,
  Bubble,
  TALKEO_BODY,
  TalkeoSaid,
  YouSaid,
} from "@/components/onboarding/chat/bubble";
import { TurnText } from "@/components/talkeo/turn-text";
import type { TalkeoTurn } from "@/core/contracts";
import type { Said } from "@/lib/onboarding/use-conversation";
import type { TurnLine } from "@/lib/talkeo/lines";

/**
 * What was said, and what is being said.
 *
 * A transcript, not a slideshow: it stays on the page and the column grows
 * downward, because the person has to be able to look back at what they were
 * asked two answers ago. Only the newest turn is played out — everything above
 * it is settled text, and re-animating it on every arrival would make the whole
 * page twitch.
 */
export function Transcript({
  said,
  turn,
  lines,
  revealedWords,
  scrolled,
  viewport,
  column,
}: {
  said: Said[];
  turn: TalkeoTurn | null;
  lines: TurnLine[];
  revealedWords: number;
  /** Whether anything has gone under the top edge yet. */
  scrolled: boolean;
  viewport: RefObject<HTMLDivElement | null>;
  column: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={viewport} className="scroll-quiet h-full overflow-y-auto">
        {/* The space between messages lives on each one rather than in a
            `gap`, so an arriving message can take its own spacing with it as
            it grows. A gap belongs to the column and is already there before
            the message is, which is a 32px jump ahead of the message that was
            supposed to be arriving gently. */}
        <div
          ref={column}
          className="mx-auto flex w-full max-w-3xl flex-col px-6 pt-4 pb-10"
        >
          {said.map((entry) => (
            <div key={entry.id} className="pt-8 first:pt-0">
              {entry.from === "you" ? (
                <YouSaid text={entry.text} />
              ) : (
                <TalkeoSaid text={entry.text} />
              )}
            </div>
          ))}

          {/* Nothing at all while the answer is on its way. A placeholder that
              appears and is then replaced is two arrivals for one message, and
              the swap is the part that reads as broken. */}
          {turn ? (
            <Arriving key={turn.turn_id}>
              <Bubble from="talkeo">
                <TurnText
                  lines={lines}
                  revealedWords={revealedWords}
                  className={TALKEO_BODY}
                />
              </Bubble>
            </Arriving>
          ) : null}
        </div>
      </div>

      {/* The transcript runs past both ends rather than stopping at them, so a
          line cut in half by an edge would read as a rendering fault. These let
          it go instead — one under the progress bar, one under the composer,
          the same height at both ends because an asymmetric pair reads as one
          of them being a mistake.

          The top one only shows once something has gone under it: with a short
          conversation there is nothing to fade, and a band of solid colour over
          empty space reads as taller than the one at the foot. */}
      <div
        aria-hidden
        className="fade-edge-top pointer-events-none absolute inset-x-0 top-0 h-6 transition-opacity duration-(--duration-control) ease-(--ease-standard)"
        style={{ opacity: scrolled ? 1 : 0 }}
      />
      <div
        aria-hidden
        className="fade-edge-bottom pointer-events-none absolute inset-x-0 bottom-0 h-6"
      />
    </div>
  );
}
