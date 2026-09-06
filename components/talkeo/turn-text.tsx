"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { TurnLine } from "@/lib/talkeo/lines";
import { cn } from "@/lib/utils";

/**
 * What the assistant is saying, arriving one visual line at a time.
 *
 * The whole turn is in the DOM from the first frame, so it never reflows as it
 * plays: the paragraph is laid out once and a clip walks down it. The bubble
 * around it is therefore exactly as tall as what can be read, and grows a line
 * at a time as the voice reaches each one.
 *
 * A visual line is not a sentence, and there is no way to know where one ends
 * without asking the browser. Every word is its own span and its `offsetTop`
 * is what groups them: same top, same line. Measured after layout and again
 * whenever the box changes width, because a resize re-breaks everything.
 *
 * Words are the unit of time and lines are the unit of reveal, which is why
 * both come in — the clip stops at the last line whose first word has been
 * spoken.
 *
 * A line resolves out of blur rather than fading in flat. A plain opacity ramp
 * is a light switch: at every moment the text is fully formed and merely dim,
 * which reads as a rendering delay. Coming out of focus reads as something
 * being written, because that is what resolving looks like.
 *
 * ⚠ `filter` is the one exception to the transform/opacity rule in this
 * project, and it lives only here. There is no composited way to blur text,
 * and the repaint is a handful of lines that were being painted anyway.
 */
const GROW_MS = 260;
const RESOLVE_MS = 420;
const BLUR_PX = 6;

function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function TurnText({
  lines,
  revealedWords,
  className,
}: {
  lines: TurnLine[];
  /** How many words the voice has reached. */
  revealedWords: number;
  className?: string;
}) {
  const words = lines.flatMap((line) => line.words);

  // A turn that is already complete when it mounts has nothing to reveal: it
  // is history being re-rendered, not something arriving. It keeps its natural
  // height and never clips, so it cannot animate from an unmeasured zero up to
  // its real size — which is a finished message replaying its own entrance.
  const [bornSettled] = useState(() => revealedWords >= words.length);

  const paragraph = useRef<HTMLParagraphElement>(null);
  // The word index each visual line starts at, first entry always 0.
  const [lineStarts, setLineStarts] = useState<number[]>([0]);
  const [lineTops, setLineTops] = useState<number[]>([]);
  const [fullHeight, setFullHeight] = useState(0);

  useLayoutEffect(() => {
    const node = paragraph.current;
    if (!node) return;

    const measure = () => {
      const spans = node.querySelectorAll<HTMLElement>("[data-word]");
      const starts: number[] = [];
      const tops: number[] = [];
      let previousTop: number | null = null;

      spans.forEach((span, index) => {
        const top = span.offsetTop;
        // Rounded, because a span carrying a taller glyph can sit a fraction
        // of a pixel off its neighbours on the same line.
        if (previousTop === null || Math.round(top) !== Math.round(previousTop)) {
          starts.push(index);
          tops.push(top);
          previousTop = top;
        }
      });

      // Only when something actually moved. The observer fires on every
      // resize, and setting a fresh array is a new reference whether or not
      // the numbers changed — which is a render in the middle of a reveal.
      setLineStarts((current) =>
        same(current, starts) ? current : starts.length > 0 ? starts : [0],
      );
      setLineTops((current) => (same(current, tops) ? current : tops));
      setFullHeight(node.scrollHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [words.length]);

  // The last line whose first word has been spoken.
  let visibleLines = 0;
  while (
    visibleLines < lineStarts.length &&
    lineStarts[visibleLines]! < revealedWords
  ) {
    visibleLines += 1;
  }

  // Every line of a paragraph is the same height, so N lines is N shares of
  // the whole — and one share is exactly `1lh`, the height the box already
  // opens at. Reading `lineTops[N]` instead is off by a few pixels and the
  // first line arrives with a jump: `offsetTop` on an inline span is the top
  // of its content box, not of the line box around it.
  const done = revealedWords >= words.length;
  const lineCount = Math.max(lineTops.length, 1);
  const lineHeight = fullHeight / lineCount;
  // Never under one line, so `height` and `min-height` never disagree. Left to
  // grow from zero the transition runs invisibly until it clears the minimum
  // and then the line appears all at once.
  const height = Math.max(
    done || visibleLines >= lineTops.length
      ? fullHeight
      : lineHeight * visibleLines,
    lineHeight,
  );

  // Only a line arriving animates. A remeasure — a resize, a font landing, the
  // whole turn settling at once under reduced motion — moves the same value
  // and has no business easing there.
  //
  // Applied to the node rather than rendered, because deciding needs the
  // previous value and a ref cannot be read during render. Layout effect, so
  // it lands before the frame is painted.
  const clip = useRef<HTMLSpanElement>(null);
  const lastVisible = useRef(visibleLines);

  useLayoutEffect(() => {
    const node = clip.current;
    if (!node) return;

    if (bornSettled) {
      node.style.transition = "none";
      node.style.height = "auto";
      return;
    }

    const grew = lastVisible.current !== visibleLines;
    lastVisible.current = visibleLines;

    node.style.transition = grew
      ? `height ${GROW_MS}ms var(--ease-entrance)`
      : "none";
    node.style.height = `${height}px`;
  }, [bornSettled, height, visibleLines]);

  return (
    <span
      ref={clip}
      data-slot="turn-text"
      // `1lh` is one line of this paragraph's own leading, so the box is never
      // shorter than what is about to be written into it — including on the
      // very first frame, before the effect above has run.
      className={cn("block min-h-[1lh] overflow-hidden", className)}
    >
      {/* Positioned, so `offsetTop` on a word is measured from here. Without
          it the offset parent is the page and every number carries the
          bubble's own position in the column. */}
      <p ref={paragraph} className="relative text-pretty">
        {words.map((word, index) => {
          // Its line, found by walking the starts. Before the first
          // measurement everything is line zero, which is what makes the very
          // first line resolve rather than pop.
          let line = 0;
          while (line + 1 < lineStarts.length && lineStarts[line + 1]! <= index) {
            line += 1;
          }
          const shown = bornSettled || line < visibleLines;

          return (
            <span
              key={index}
              data-word
              style={{
                opacity: shown ? 1 : 0,
                filter: shown ? "blur(0px)" : `blur(${BLUR_PX}px)`,
                transition: `opacity ${RESOLVE_MS}ms var(--ease-standard), filter ${RESOLVE_MS}ms var(--ease-standard)`,
              }}
            >
              {word}
              {index < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </p>
    </span>
  );
}
