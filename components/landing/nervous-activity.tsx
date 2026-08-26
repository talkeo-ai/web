"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

import { prefersReducedMotion } from "@/lib/motion";

type ActivityDef = { action: string; text: string };

function getActivities(
  t: (key: string) => string,
  mobile = false,
): ActivityDef[] {
  // Cards fire in pool order, one at a time, so each run of four reads as a
  // small story: something gets measured, a goal appears, a gap is named, and
  // an exercise answers it. Keep the pool length a multiple of the slot count
  // so every run lands on the same positions.
  if (mobile) {
    // One story only — fewer cards fit before they overlap.
    return [
      { action: t("levelDetected"), text: t("levelValue") },
      { action: t("goalAssigned"), text: t("goalInterview") },
      { action: t("gapDetected"), text: t("gapInterview") },
      { action: t("exerciseCreated"), text: t("exerciseInterview") },
    ];
  }
  return [
    { action: t("levelDetected"), text: t("levelValue") },
    { action: t("goalAssigned"), text: t("goalInterview") },
    { action: t("gapDetected"), text: t("gapInterview") },
    { action: t("exerciseCreated"), text: t("exerciseInterview") },
    { action: t("errorLogged"), text: t("errorAge") },
    { action: t("goalAssigned"), text: t("goalTravel") },
    { action: t("gapDetected"), text: t("gapTravel") },
    { action: t("exerciseCreated"), text: t("exerciseTravel") },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────
   The timeline

   One run of one card, in milliseconds from its own start. These are not
   design tokens and do not belong in the stylesheet: they are a single
   sequence whose steps only mean anything relative to each other, so they
   live together where that relationship is readable.

   The shape is the physical one. The line reaches the anchor before the card
   exists; the card comes out of the line rather than materialising beside it;
   the entrance takes longer than the exit; and every step is a consequence of
   the one before it instead of a slot on a fixed grid.
   ───────────────────────────────────────────────────────────────────────── */

/* The line goes on `--ease-standard` rather than the entrance curve, and this
   is the whole reason the card used to look late. A strong ease-out puts 62%
   of a stroke's travel in its first 100ms and then spends a third of its
   duration crawling the last few percent, so the line *looks* finished long
   before it is — and anything waiting on its nominal end reads as a pause.
   Accelerate-then-decelerate is what a real point-to-point move does, and its
   nominal duration is its perceived one.

   Its length is set by the card and not the other way round: the line must not
   read as finished before there is anything at the end of it. At 400 it passes
   99% at 340ms, by which point the card is already fading up, and completes at
   400 with the card at 61%. A finished line with nothing on the end of it is a
   state that never exists — which it did at 320, for about six frames. */
const LINE_DRAW = 400;

/* The joint follows the line rather than leading it — a dot sitting at the end
   of a stroke that has not arrived yet is a dot floating in space. It is also
   the piece that gave the fault away: the card covers it, so the only time it
   is ever visible is when the card is missing. */
const JOINT_AT = 340;
const JOINT_IN = 180;

/* The card leaves before the line has landed — overlapping the two is what
   removes the seam between them. Causality survives the overlap because the
   fade trails the movement by a beat: at the moment the line touches down the
   card is a third of the way along its travel at 5% opacity, so what the eye
   gets is the line arriving and the card coming out of it, in that order.

   Its travel runs a third longer than the line's rather than matching it,
   because it is still moving when the line stops: it overshoots at ~490ms,
   with the fade already at 92%, and settles at 640 — sixty past the point
   the fade completes. That order is the whole fix. The other way round, the
   movement finishes early and leaves the fade crossfading a card that has
   stopped, which is what reads as appearing all at once. */
const CARD_AT = 220;
const CARD_MOVE = 420;
const CARD_FADE = 300;
const CARD_FADE_DELAY = 60;

/* A value waits for its box to land *and settle* rather than racing it: the
   bump peaks just before this, so the order reads box → bounce → writing
   instead of all three at once. Measured from the card's own start. */
const TYPING_AFTER_CARD = 340;

/* Card, joint and line all leave over the same 300ms. Staggering the exits is
   what left a stub of line retracting on its own after the card had gone. */
const CARD_OUT = 300;
const LINE_RETRACT = 300;

const TYPE_STEP = 34;
/** Held after a separator, where someone reading aloud would draw breath. */
const TYPE_PAUSE = 150;
const SEPARATOR = /[:·,.]/;

/* How long a finished card stays. Reading cost is roughly linear in length,
   so a short value does not sit there and a long one is never cut off. Both
   numbers are set for reading the value *after* it finishes being written:
   the writing itself is not reading time, because the sentence is not all
   there yet to be read. */
const HOLD_BASE = 2000;
const HOLD_PER_CHAR = 55;

/* When the next card starts, measured from when this one finished being
   written — so two cards never type at once. That single constraint is what
   turns a stream of cards into a sequence instead of noise. Clamped at both
   ends so the loop neither stalls on a short value nor races through a long
   one, and the floor also guarantees a slot is free long before it is reused:
   four beats at the floor is 8.8s against a longest-possible card of ~6.0s. */
const BEAT_REST = 420;
const MIN_BEAT = 2200;
const MAX_BEAT = 3000;

/** Narrow screens hold everything longer — the cards sit closer together, so
    they need more room in time to not read as clutter. */
const MOBILE_STRETCH = 1.35;

/* Scale only — no translation on either axis. The card unfolds out of the
   joint and bumps back through it, rather than sliding in from somewhere and
   arriving. That is what the transform origin buys: pinned to the edge the
   line touches, the pinned edge does not move at all and the whole of the
   growth happens outward from it.

   0.94 → 1 with the bump's 24% overshoot puts the peak at 1.015: on a 230px
   card the far edge travels ~14px in and carries ~3.4px past its resting
   place. Anything deeper starts to soften the text, which is rasterised at
   whatever scale the layer was promoted at. */
const SCALE_IN = 0.94;
const SCALE_OUT = 0.97;

/**
 * When each character lands, in ms from the start of typing.
 *
 * A constant interval reads as a progress bar filling. What reads as text
 * being typed is the pause at a separator. Computed once per card so the
 * phase timeline and the typing itself cannot disagree about when the value
 * is finished.
 */
function typeSchedule(chars: string[]): number[] {
  const times: number[] = [];
  let t = 0;
  for (const ch of chars) {
    t += TYPE_STEP;
    times.push(t);
    if (SEPARATOR.test(ch)) t += TYPE_PAUSE;
  }
  return times;
}

type Timeline = {
  chars: string[];
  /** Per-character delays, relative to the start of typing. */
  schedule: number[];
  openAt: number;
  typingAt: number;
  heldAt: number;
  leavingAt: number;
  endAt: number;
  /** How long until the next card should start. */
  beat: number;
};

function buildTimeline(text: string, stretch: number): Timeline {
  const chars = Array.from(text);
  const schedule = typeSchedule(chars);
  const typingAt = CARD_AT + TYPING_AFTER_CARD;
  const heldAt = typingAt + (schedule.at(-1) ?? 0);
  const leavingAt =
    heldAt + (HOLD_BASE + chars.length * HOLD_PER_CHAR) * stretch;

  return {
    chars,
    schedule,
    openAt: CARD_AT,
    typingAt,
    heldAt,
    leavingAt,
    endAt: leavingAt + Math.max(CARD_OUT, LINE_RETRACT),
    beat: Math.min(
      MAX_BEAT * stretch,
      Math.max(MIN_BEAT * stretch, (heldAt + BEAT_REST) * stretch),
    ),
  };
}

/* ───────────────────────────────────────────────────────────────────────── */

type Anchor = "left" | "right";

const slotConfigs = [
  {
    path: "M 215,130 L 215,90 Q 215,75 200,75 L 170,75",
    left: 34,
    top: 15,
    anchor: "right",
  },
  {
    path: "M 285,370 L 285,410 Q 285,425 300,425 L 330,425",
    left: 66,
    top: 85,
    anchor: "left",
  },
  {
    path: "M 285,130 L 285,90 Q 285,75 300,75 L 330,75",
    left: 66,
    top: 15,
    anchor: "left",
  },
  {
    path: "M 215,370 L 215,410 Q 215,425 200,425 L 170,425",
    left: 34,
    top: 85,
    anchor: "right",
  },
] as const satisfies readonly {
  path: string;
  left: number;
  top: number;
  anchor: Anchor;
}[];

/**
 * The three transforms a card moves between.
 *
 * `translate` here is placement, not motion — it is the same in all three
 * states and only exists to hang the box off its anchor. The animation is
 * purely the scale, growing from and collapsing back into the edge the line
 * touches. All three list the same functions in the same order, which is what
 * lets the browser interpolate componentwise instead of matrix-blending.
 */
function cardTransforms(anchor: Anchor) {
  const place =
    anchor === "right" ? "translate(-100%, -50%)" : "translate(0%, -50%)";
  return {
    origin: anchor === "right" ? "100% 50%" : "0% 50%",
    enter: `${place} scale(${SCALE_IN})`,
    rest: `${place} scale(1)`,
    exit: `${place} scale(${SCALE_OUT})`,
  };
}

/**
 * A dot, not an I-beam, sitting on the text's optical centre rather than its
 * baseline — and the same 4px as the joint at the far end of the line, so the
 * mark for "the line ends here" and the one for "the writing is here" are one
 * shape rather than two.
 *
 * The wrapper is zero-width, so this can never change where the line it sits
 * on wraps.
 */
function Caret() {
  return (
    <span className="relative inline-block w-0 align-baseline" aria-hidden>
      {/* Bottom edge at 0.26em over the baseline, then pushed back down by
          half its own height: the centre lands on 0.26em, which is where
          half the x-height sits. */}
      <span
        className="bg-foreground/70 absolute bottom-[0.26em] left-[3px] block size-1 translate-y-1/2 rounded-full"
        style={{ animation: "caret-blink 1s step-end infinite" }}
      />
    </span>
  );
}

/**
 * The arrow in the copy, drawn rather than typeset.
 *
 * The messages carry a plain "→" (U+2192), and that is right for a copy file —
 * but the font subset loaded here covers U+2191 and U+2193 and stops there, so
 * the one arrow that actually gets used falls through to whatever the system
 * provides and renders in a different family from the words on either side of
 * it. Drawing it puts the arrow back in the same weight and on the same
 * optical centre as the text, and gives it a fixed 1em advance so the ghost
 * and the typed layer always measure the same.
 */
const ARROW = "→";

function Arrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="inline-block size-[1em] align-middle"
    >
      <path
        d="M2.75 8h10.5M9.25 4.25 13.25 8l-4 3.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Characters as nodes, with runs of plain text kept whole.
 *
 * Both the ghost and the typed layer go through here, so they cannot disagree
 * about width. Batching the runs matters: one text node per character would
 * measure the same but litter the DOM with thirty of them per card.
 */
function renderChars(chars: string[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let run = "";
  chars.forEach((ch, i) => {
    if (ch !== ARROW) {
      run += ch;
      return;
    }
    if (run) {
      out.push(run);
      run = "";
    }
    out.push(<Arrow key={i} />);
  });
  if (run) out.push(run);
  return out;
}

function TypewriterText({
  chars,
  schedule,
}: {
  chars: string[];
  schedule: number[];
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Typing is motion driven by a clock, so the CSS rule cannot reach it:
    // with reduced motion the text is simply there.
    if (prefersReducedMotion()) {
      setCount(chars.length);
      return;
    }

    setCount(0);
    // A frame loop rather than an interval: an interval quantises every step
    // to its own period and drifts over the length of a word, and browsers
    // throttle it to once a second in a background tab, which would leave a
    // card half-written. Frames simply stop when the tab is hidden.
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      let i = 0;
      while (i < schedule.length && schedule[i] <= elapsed) i++;
      setCount(i);
      if (i < schedule.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [chars, schedule]);

  return <>{renderChars(chars.slice(0, count))}</>;
}

type Phase = "line" | "opening" | "typing" | "held" | "leaving";
type SlotState = {
  // The ActivityDef currently displayed in this slot.
  activity: ActivityDef;
  timeline: Timeline;
  phase: Phase;
  // Per-animation id, so phase updates only apply to the run they were
  // scheduled for.
  runId: number;
} | null;

let globalRunId = 0;

/**
 * The cards that surface around the hero artwork, one after another.
 *
 * Takes no props: it renders the same illustrative loop everywhere it is used.
 */
export function NervousActivity() {
  const t = useTranslations("nervousActivity");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);
  const poolRef = useRef<ActivityDef[]>(getActivities(t, false));
  useEffect(() => {
    poolRef.current = getActivities(t, isMobile);
    // Both cursors, not just the pool one: they advance in lockstep, and it is
    // that lockstep over a pool sized to a multiple of the slots which keeps
    // each beat of a story landing in the same corner every time round.
    nextIndexRef.current = 0;
    nextSlotRef.current = 0;
  }, [isMobile, t]);
  const [slots, setSlots] = useState<SlotState[]>([null, null, null, null]);
  const nextIndexRef = useRef(0);
  const nextSlotRef = useRef(0);
  // The phase transitions still queued, keyed by run. Keyed rather than
  // appended so a finished run drops out of the map instead of leaving its
  // spent timers to accumulate for as long as the page is open.
  const runTimersRef = useRef(
    new Map<number, ReturnType<typeof setTimeout>[]>(),
  );

  const update = (slotIdx: number, runId: number, phase: Phase) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[slotIdx]?.runId === runId)
        next[slotIdx] = { ...next[slotIdx]!, phase };
      return next;
    });
  };

  const clear = (slotIdx: number, runId: number) => {
    runTimersRef.current.delete(runId);
    setSlots((prev) => {
      const next = [...prev];
      if (next[slotIdx]?.runId === runId) next[slotIdx] = null;
      return next;
    });
  };

  const animateActivity = useCallback(
    (activity: ActivityDef, stretch: number): Timeline => {
      const slotIdx = nextSlotRef.current;
      const runId = ++globalRunId;
      const timeline = buildTimeline(activity.text, stretch);

      setSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = { activity, timeline, phase: "line", runId };
        return next;
      });

      // Timers are tracked so cleanup can cancel them. Without that they
      // outlive the component by seconds, still calling `setSlots` on a tree
      // that is gone — and a re-run of the cycle effect leaves the previous
      // card's transitions running underneath the new one.
      const timers: ReturnType<typeof setTimeout>[] = [];
      const at = (delay: number, fn: () => void) =>
        timers.push(setTimeout(fn, delay));

      at(timeline.openAt, () => update(slotIdx, runId, "opening"));
      at(timeline.typingAt, () => update(slotIdx, runId, "typing"));
      at(timeline.heldAt, () => update(slotIdx, runId, "held"));
      at(timeline.leavingAt, () => update(slotIdx, runId, "leaving"));
      at(timeline.endAt, () => clear(slotIdx, runId));
      runTimersRef.current.set(runId, timers);

      nextSlotRef.current = (slotIdx + 1) % slotConfigs.length;
      return timeline;
    },
    [],
  );

  /** Advances the cursor, animates what it lands on, and reports the rest
      owed before the next one. */
  const showNext = useCallback(
    (stretch: number): number => {
      const pool = poolRef.current;
      if (pool.length === 0) return MIN_BEAT * stretch;

      const index = nextIndexRef.current;
      nextIndexRef.current = (index + 1) % pool.length;
      return animateActivity(pool[index], stretch).beat;
    },
    [animateActivity],
  );

  useEffect(() => {
    // Cards appearing and fading on a loop is decorative motion on a timer.
    // Nothing here conveys information the rest of the page does not, so with
    // reduced motion the cycle simply does not run.
    if (prefersReducedMotion()) return;

    const stretch = isMobile ? MOBILE_STRETCH : 1;
    let timeoutId: ReturnType<typeof setTimeout>;
    // The gap is not a constant: each card asks for the next one when it has
    // finished writing itself.
    const tick = () => {
      timeoutId = setTimeout(tick, showNext(stretch));
    };
    // Half a beat of stillness before the first card — an instant start reads
    // cheap, and the page has not settled yet either.
    const initial = setTimeout(tick, isMobile ? 1200 : 800);

    const runs = runTimersRef.current;
    return () => {
      clearTimeout(initial);
      clearTimeout(timeoutId);
      // Cancels the transitions already queued for cards mid-flight.
      runs.forEach((timers) => timers.forEach(clearTimeout));
      runs.clear();
    };
  }, [showNext, isMobile]);

  return (
    // Decorative: an illustration of the product that happens to be made of
    // words. Announcing a half-typed value, and then announcing it again on
    // every loop, is noise rather than content. `contents` so this wrapper
    // generates no box — the cards resolve their position against the frame
    // the orb sits in, exactly as they did without it.
    <div aria-hidden className="contents">
      {slots.map((slot, i) => {
        if (!slot) return null;
        const config = slotConfigs[i];
        const { activity, timeline, phase } = slot;
        const leaving = phase === "leaving";
        const open = phase !== "line";
        const transforms = cardTransforms(config.anchor);

        return (
          <div key={`slot-${slot.runId}`} className="contents">
            {/* The connector — behind the orb, so it reads as coming out
                from under it. */}
            <div className="pointer-events-none absolute inset-0 z-10 h-full w-full">
              <svg className="h-full w-full" viewBox="0 0 500 500" fill="none">
                <defs>
                  <mask
                    id={`mask-${slot.runId}`}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="500"
                    height="500"
                  >
                    <path
                      d={config.path}
                      stroke="white"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      pathLength="1"
                      strokeDasharray="1"
                      style={{
                        animation: leaving
                          ? `line-retract ${LINE_RETRACT}ms var(--ease-exit) both`
                          : `line-draw ${LINE_DRAW}ms var(--ease-standard) both`,
                      }}
                    />
                  </mask>
                </defs>
                <path
                  d={config.path}
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  fill="none"
                  className="text-foreground/30"
                  mask={`url(#mask-${slot.runId})`}
                />
              </svg>
            </div>

            {/* The joint where the connector meets the card. Brighter than the
                line it terminates — a joint dimmer than its own line reads as
                a gap in the line rather than as an end to it. */}
            <div
              className="bg-foreground/55 pointer-events-none absolute z-30 size-1 rounded-full will-change-transform"
              style={{
                top: `${config.top}%`,
                left: `${config.left}%`,
                animation: leaving
                  ? `joint-out ${CARD_OUT}ms var(--ease-exit) both`
                  : `joint-in ${JOINT_IN}ms var(--ease-entrance) ${JOINT_AT}ms both`,
              }}
            />

            {/* Card */}
            <div
              className="pointer-events-none absolute z-30 will-change-transform"
              style={{
                top: `${config.top}%`,
                left: `${config.left}%`,
                transformOrigin: transforms.origin,
                transform: leaving
                  ? transforms.exit
                  : open
                    ? transforms.rest
                    : transforms.enter,
                opacity: open && !leaving ? 1 : 0,
                // Two curves, not one. The movement runs long and overshoots
                // so the card lands; the fade is shorter and starts a beat
                // later so the head start it takes on the line stays hidden.
                // Both share a soft start, which is what keeps them reading as
                // one gesture with the line rather than three separate ones.
                transition: leaving
                  ? `opacity ${CARD_OUT}ms var(--ease-exit), transform ${CARD_OUT}ms var(--ease-exit)`
                  : `opacity ${CARD_FADE}ms var(--ease-standard) ${CARD_FADE_DELAY}ms, transform ${CARD_MOVE}ms var(--ease-bump)`,
              }}
            >
              {/* Opaque, not translucent. The artwork behind this is a
                  saturated glow, and a surface that lets it through picks up
                  a tint that changes as it drifts — which is the tell of a
                  div sitting on top of something rather than of a label
                  attached to it. Opaque also drops a `backdrop-filter` from
                  three simultaneous layers over a live canvas.

                  `w-max` under a cap: the box is the width of its own words,
                  not of the longest card in the set. The mobile cap is what
                  the anchor leaves before the card runs off a 375px screen,
                  which it did. */}
              <div className="bg-card-quiet border-border shadow-raised w-max max-w-[128px] rounded-xl border px-2.5 py-2 sm:max-w-[230px] sm:px-3.5 sm:py-2.5">
                {/* Full strength, no alpha: at this size the label is already
                    subordinate by scale, case and tracking, and dimming it on
                    top of that took it to 3:1, which reads as broken rather
                    than as quiet. */}
                <span className="text-muted-foreground block text-[9px] font-medium tracking-wider uppercase sm:text-[10px]">
                  {activity.action}
                </span>
                {/* Width without height. The ghost carries the full value, so
                    the box is its final width from the first frame and the
                    text never rewraps unpredictably as it is typed — but `h-0`
                    keeps it from reserving the height too, which would leave a
                    two-line card half empty for as long as the first line
                    takes. The box grows the moment a word drops to line two,
                    and because the card is centred on its anchor it grows
                    symmetrically, so the line never leaves its edge.

                    Greedy wrapping on purpose, no `text-pretty`: pretty
                    rebalances against the whole string, so growing text would
                    reshuffle lines already written.

                    Ligatures off, so a pair like "fi" does not close up and
                    shift the text as the next character arrives. */}
                {/* One step below full foreground on purpose: the value is text and
                    so is the headline, and at equal luminance the two compete
                    for the same read. Motion already guarantees these get
                    noticed; brightness is what they can give back. */}
                <p className="text-foreground/80 mt-1 text-[11px] leading-snug [font-variant-ligatures:none] sm:text-[13px]">
                  <span
                    aria-hidden
                    className="invisible block h-0 overflow-hidden"
                  >
                    {renderChars(timeline.chars)}
                  </span>
                  {/* The zero-width space holds one line box open, so the card
                      opens at the height it is about to need instead of
                      snapping up when the first character lands. */}
                  <span className="text-foreground/90 block">
                    {"\u200B"}
                    {phase === "typing" ? (
                      <TypewriterText
                        chars={timeline.chars}
                        schedule={timeline.schedule}
                      />
                    ) : phase === "opening" ? null : (
                      renderChars(timeline.chars)
                    )}
                    {(phase === "opening" || phase === "typing") && <Caret />}
                  </span>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
