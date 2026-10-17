"use client";

import { useEffect, useState, type ReactNode } from "react";

import { TurnText } from "@/components/talkeo/turn-text";
import { MESSAGE_IN_MS } from "@/lib/onboarding/motion";
import { splitLines } from "@/lib/talkeo/lines";
import { stripVoiceTags } from "@/lib/talkeo/voice-tags";
import { cn } from "@/lib/utils";

/** One declaration, so a turn being said and a settled one cannot drift apart. */
export const TALKEO_BODY = "text-foreground text-[18px] leading-[1.7]";

export function Bubble({
  from,
  children,
  arriving = true,
  signed = true,
}: {
  from: "talkeo" | "you";
  children: ReactNode;
  /** False once it is only history: it already faded in when it was new. */
  arriving?: boolean;
  /**
   * False where the bubble is alone and nobody else could have said it. The
   * signature tells two voices apart in a column of them; on its own it is a
   * label on the only thing in the box.
   */
  signed?: boolean;
}) {
  return (
    <div
      data-slot="bubble"
      data-from={from}
      className={cn(
        // `w-fit`, so it takes the width of what is in it. Its content is a
        // block, and a block in a column stretches to the full track unless it
        // is told otherwise — which is how a two-word answer ends up as wide as
        // the page.
        //
        // Capped in ch rather than in a share of the column, so the measure
        // stays readable whatever the container does. 70ch is the ceiling for
        // reading, but at this size that is nearly the whole track and the
        // bubble stops reading as a bubble at all. This is short of it on
        // purpose.
        "w-fit max-w-[56ch] rounded-2xl px-4 py-2.5",
        // One step apart on the same surface ramp, not two unrelated fills.
        // Talkeo carries the reading so it sits closest to the page; your own
        // line is short and reads as an interruption, so it comes forward.
        from === "you"
          ? "bg-surface-tertiary ml-auto"
          : "bg-surface-secondary mr-auto",
      )}
      style={
        arriving
          ? { animation: `message-in ${MESSAGE_IN_MS}ms var(--ease-standard) both` }
          : undefined
      }
    >
      {children}
      {from === "talkeo" && signed ? (
        <p className="text-text-tertiary mt-1.5 text-xs font-medium">Talkeo</p>
      ) : null}
    </div>
  );
}

/**
 * A message taking up its room instead of appearing in it.
 *
 * Fading in was only half of it: the box arrived at its full first-line height
 * in one frame, so everything above jumped while the text underneath politely
 * faded. Growing from nothing puts the two on the same clock.
 *
 * It only has to cover the first line — from there `TurnText` grows on its own
 * as the voice reaches each one, and `1fr` hands the height back to it.
 */
export function Arriving({ children }: { children: ReactNode }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="grid"
      style={{
        // `minmax(0, …)` at both ends: a bare `0fr` stops at the content's own
        // minimum and the row never actually closes.
        gridTemplateRows: grown ? "minmax(0, 1fr)" : "minmax(0, 0fr)",
        transition: `grid-template-rows ${MESSAGE_IN_MS}ms var(--ease-entrance)`,
      }}
    >
      <div className="overflow-hidden">
        {/* The spacing lives inside the clipped row, so it grows with the
            bubble instead of being there before it. */}
        <div className="pt-8">{children}</div>
      </div>
    </div>
  );
}

export function TalkeoSaid({
  text,
  signed = true,
}: {
  text: string;
  signed?: boolean;
}) {
  // The same stripping as while it played, or a settled turn shows the delivery
  // marks that the live one hid. With the service speaking there is nothing left
  // to strip; it stays because a tag that leaks must not reach a reader.
  const lines = splitLines(stripVoiceTags(text).text);
  const words = lines.reduce((total, line) => total + line.words.length, 0);
  return (
    <Bubble from="talkeo" arriving={false} signed={signed}>
      <TurnText lines={lines} revealedWords={words} className={TALKEO_BODY} />
    </Bubble>
  );
}

export function YouSaid({ text }: { text: string }) {
  return (
    <Bubble from="you">
      <p className="text-foreground text-[18px] leading-[1.7] wrap-anywhere">
        {text}
      </p>
    </Bubble>
  );
}
