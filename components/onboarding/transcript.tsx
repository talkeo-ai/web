"use client";

import type { ReactNode, RefObject } from "react";

import { TurnText } from "@/components/talkeo/turn-text";
import type { Said } from "@/lib/onboarding/conversation";
import type { TurnPlayback } from "@/lib/talkeo/use-turn-playback";

import { Arriving, Bubble, TALKEO_BODY, TalkeoSaid, YouSaid } from "./bubble";

/**
 * The conversation, from the top.
 *
 * What is settled is history and never animates again; the turn being said now
 * arrives, and grows a line at a time as it is said. The two are drawn by
 * different components on purpose — a finished message replaying its own
 * entrance is the thing that reads as broken.
 */
export function Transcript({
  said,
  live,
  playback,
  heard,
  surface,
  viewport,
  column,
  scrolled,
}: {
  said: Said[];
  /** The turn being said now, if there is one. Keyed by it, so each one mounts. */
  live: { turn_id: string } | null;
  playback: TurnPlayback;
  /**
   * The surface for where the conversation is, drawn under the message that
   * asked for it. It is one of the ways to answer that message, so it sits
   * where the answer goes. Keyed, so a new one arrives instead of swapping in.
   */
  surface: { key: string; node: ReactNode } | null;
  /** What they are saying out loud, as it is transcribed. */
  heard: string;
  viewport: RefObject<HTMLDivElement | null>;
  column: RefObject<HTMLDivElement | null>;
  scrolled: boolean;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={viewport} className="scroll-quiet h-full overflow-y-auto">
        {/* The space between messages lives on each one rather than in a `gap`,
            so an arriving message brings its own spacing with it as it grows. A
            gap belongs to the column and is already there before the message is,
            which is a 32px jump ahead of the message that was supposed to be
            arriving gently. */}
        <div
          ref={column}
          className="mx-auto flex w-full max-w-3xl flex-col pt-4 pr-4 pb-10 pl-6"
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

          {/* Not before its first word: the turn opens about a second before
              there is anything to say, and the bubble sat empty through it.
              And it is simply there, with no fade and no growing: both ran on
              the empty bubble before, where nobody saw them, and on the text
              the fade dims the words and the growing clips them. The words
              writing themselves in are the arrival. */}
          {live && playback.revealedWords > 0 ? (
            <div key={live.turn_id} className={said.length === 0 ? undefined : "pt-8"}>
              <Bubble from="talkeo" arriving={false} growing>
                <TurnText
                  lines={playback.lines}
                  revealedWords={playback.revealedWords}
                  className={TALKEO_BODY}
                />
              </Bubble>
            </div>
          ) : null}

          {surface ? (
            <Arriving key={surface.key}>
              <div data-slot="chat-surface">{surface.node}</div>
            </Arriving>
          ) : null}

          {/* What they are saying, in their own bubble rather than in the field.
              Somebody speaking is not typing, and putting their words in the
              input would say they were. */}
          {heard ? (
            <div className="pt-8">
              <YouSaid text={heard} />
            </div>
          ) : null}
        </div>
      </div>

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
