"use client";

import { useEffect, useState } from "react";

import type { TurnLine } from "@/lib/talkeo/lines";
import { cn } from "@/lib/utils";

/**
 * A turn with the screen to itself, while it is being said.
 *
 * No bubble and no column: at the start of a run there is nothing to look back
 * at, so drawing a transcript would be drawing a list of one. What is on screen
 * is what is being said, at the size of the only thing there.
 *
 * Three rules it does not share with the transcript, and together they are why
 * this is its own component rather than `TurnText` at a bigger size:
 *
 * - **One character at a time, in one line of writing.** A word is the unit the
 *   service times, but a word is not how writing reads: staggering letters
 *   inside each word starts the next word before the last one has finished, and
 *   two words arriving at once is exactly what writing never looks like. So the
 *   characters advance on a single sequence across the whole sentence.
 * - **The clock is a ceiling, not a metronome.** The pen never gets ahead of
 *   what the voice has said; when the voice is ahead the pen catches up
 *   proportionally, which is fast without being a jump.
 * - **Every character is in the paragraph from the first frame**, the unwritten
 *   ones at zero opacity. They hold their place, so the block is at its full
 *   height before a word of it has arrived and centring it cannot move it.
 *   Revealing by growing a box is what makes the line you are reading slide out
 *   from under you.
 */

/** How often the pen moves. One frame at 60Hz. */
const TICK_MS = 16;
/** How long a character takes to arrive once it does. */
const LETTER_IN_MS = 260;
/**
 * How hard it catches up. The gap to the voice is closed by this fraction each
 * tick, on top of the one character a tick always advances — so a pen that is
 * far behind moves quickly and one that is nearly there does not skip.
 */
const CATCH_UP = 1 / 10;

export function SpokenTurn({
  lines,
  revealedWords,
}: {
  lines: TurnLine[];
  revealedWords: number;
}) {
  const words = lines.flatMap((line) => line.words);

  // Written with the trailing space, because that space is what the eye reads
  // as the gap before the next word starts.
  const written = words.map((word) => `${word} `);
  const upTo = written
    .slice(0, revealedWords)
    .reduce((total, word) => total + word.length, 0);

  const [pen, setPen] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPen((at) => {
        if (at >= upTo) return at;
        return Math.min(upTo, at + 1 + Math.floor((upTo - at) * CATCH_UP));
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [upTo]);

  let index = 0;

  return (
    <div
      data-slot="spoken-turn"
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-8"
    >
      {/* Left-aligned inside a centred block. Centred text reads as a slogan;
          this is somebody talking, and a talker's lines start in one place. */}
      {/* Set to be read, not to be a headline. Normal weight, because 500 at
          this size is a title and a title gets scanned; a little more leading
          than a heading would take, because the lines are long; and no
          negative tracking, which is for display sizes where the gaps grow
          with the letters and here only closes up the words. */}
      <p className="text-foreground w-full max-w-lg text-[26px] leading-[1.5] text-pretty sm:text-[28px]">
        {written.map((word, at) => (
          // Inline-block, so a word never breaks between its own letters. The
          // line still wraps between words, which is the only place a line is
          // allowed to break.
          <span key={at} className="inline-block whitespace-pre">
            {[...word].map((letter) => {
              const shown = index++ < pen;

              return (
                <span
                  key={index}
                  className={cn(
                    "inline-block transition-opacity ease-(--ease-standard)",
                    shown ? "opacity-100" : "opacity-0",
                  )}
                  style={{ transitionDuration: `${LETTER_IN_MS}ms` }}
                >
                  {letter}
                </span>
              );
            })}
          </span>
        ))}
      </p>
    </div>
  );
}
