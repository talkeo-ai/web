"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createPortal } from "react-dom";

import { Composer } from "@/components/onboarding/composer";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import {
  MarkTargets,
  useFireMark,
  useResetMarks,
} from "@/components/talkeo/mark-target";
import { TurnText } from "@/components/talkeo/turn-text";
import type { Step, TalkeoTurn } from "@/core/contracts";
import { useRouter } from "@/lib/i18n/navigation";
import { splitLines } from "@/lib/talkeo/lines";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";
import { unlockVoice, voiceElement } from "@/lib/talkeo/voice";
import { cn } from "@/lib/utils";

type FetchTurn = () => Promise<{ turn: TalkeoTurn; step: Step } | null>;

type Said = { id: string; from: "talkeo" | "you"; text: string };

const MESSAGE_IN_MS = 620;

/** The seven turns the interview takes, from the script. See below. */
const INTERVIEW_TURNS = 7;

/** How far from the bottom still counts as following along. */
const NEAR_BOTTOM_PX = 160;

/**
 * The floor on how fast an answer may arrive.
 *
 * The fixture answers in no time, so without this the reply lands on top of
 * your own message while that is still fading in — two entrances overlapping,
 * from different starting points, which is what reads as inconsistent. It is
 * also just true of anything real: a turn takes a moment to come back.
 *
 * Long enough for a message to finish arriving before the next one starts.
 */
const MIN_ANSWER_MS = MESSAGE_IN_MS + 120;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function atBottom(node: HTMLElement): boolean {
  return (
    node.scrollTop + node.clientHeight >= node.scrollHeight - NEAR_BOTTOM_PX
  );
}

/**
 * The conversation.
 *
 * A transcript, not a slideshow: what was said stays on the page and the
 * column grows downward, because the person has to be able to look back at
 * what they were asked two answers ago. Only the newest turn is played out —
 * everything above it is settled text and re-animating it on every arrival
 * would make the whole page twitch.
 *
 * Nothing here scripts the assistant. Which turn comes next, and what it
 * points at, is the service's answer; this renders it.
 */
export function ChatScreen({
  name,
  current,
  next,
  onStep,
  dock,
}: {
  name: string | null;
  current: FetchTurn;
  next: FetchTurn;
  /** Where the service says the run is, every time it says it. */
  onStep?: (step: Step) => void;
  /**
   * Somewhere else to put a way of answering, when the panel has the screen.
   *
   * A second composer rather than the same one moved: one control that jumps
   * across the page reads as having been taken from you and put back
   * somewhere else. Two, each appearing where it belongs and leaving with
   * whatever it belongs to, read as two ways of doing the same thing.
   */
  dock?: HTMLElement | null;
}) {
  return (
    <MarkTargets>
      <Conversation
        name={name}
        current={current}
        next={next}
        onStep={onStep}
        dock={dock}
      />
    </MarkTargets>
  );
}

function Conversation({
  name,
  current,
  next,
  onStep,
  dock,
}: {
  name: string | null;
  current: FetchTurn;
  next: FetchTurn;
  onStep?: (step: Step) => void;
  dock?: HTMLElement | null;
}) {
  const t = useTranslations("onboarding.chat");
  const router = useRouter();

  const [said, setSaid] = useState<Said[]>([]);
  const [turn, setTurn] = useState<TalkeoTurn | null>(null);
  const [pending, setPending] = useState(false);
  // Monotonic, so a message keeps its identity for the life of the list.
  // Keying off the length collides the moment two entries land at once.
  const saidCount = useRef(0);

  const fireMark = useFireMark();
  const resetMarks = useResetMarks();
  // One element for the whole run, so the press that opened it is what lets
  // every turn after be heard.
  const [voice] = useState(voiceElement);
  const { lines, revealedWords, written } = useTurnPlayback(turn, {
    onMark: fireMark,
    voice,
  });

  // Not a transition. React is free to throw a transition's render away and
  // redo it, and every inline `animation` in the list restarts when it does —
  // which is the whole transcript flickering on send.
  const load = async (fetch: FetchTurn, youSaid?: string) => {
    unlockVoice();
    setPending(true);
    resetMarks();

    // What was on screen joins the transcript, and stops being the live turn:
    // otherwise it is on the page twice while the next one is fetched.
    setSaid((previous) => [
      ...previous,
      ...(turn
        ? [
            {
              id: `talkeo-${(saidCount.current += 1)}`,
              from: "talkeo" as const,
              text: turn.text,
            },
          ]
        : []),
      ...(youSaid
        ? [
            {
              id: `you-${(saidCount.current += 1)}`,
              from: "you" as const,
              text: youSaid,
            },
          ]
        : []),
    ]);
    setTurn(null);

    const [result] = await Promise.all([fetch(), wait(MIN_ANSWER_MS)]);
    setPending(false);

    if (!result) {
      router.refresh();
      return;
    }
    setTurn(result.turn);
    onStep?.(result.step);
  };

  const send = (text: string) => {
    // Sending is the one thing that takes the view back, wherever they were
    // reading: you asked for the answer, so you get to see it arrive.
    following.current = true;

    // The run having moved on is not the end of the conversation any more:
    // the work opens beside it and this stays where it is.
    void load(next, text);
  };

  // Coming back resumes the turn that was on screen; it does not spend another
  // one. The ref is what keeps development's double mount to one call.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    setPending(true);
    void current().then((result) => {
      setPending(false);
      if (!result) {
        router.refresh();
        return;
      }
      setTurn(result.turn);
      onStep?.(result.step);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Following the conversation is the default and stays that way until the
  // person scrolls up to read. A programmatic scroll ends at the bottom too,
  // so following keeps following without any flag to unset.
  //
  // The transcript scrolls inside its own box rather than moving the page,
  // because the page is about to hold a second column that scrolls on its own.
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;

    const onScroll = () => {
      following.current = atBottom(node);
      // Only when something has actually gone under it. With a short
      // conversation there is nothing above to fade, and a band of solid
      // colour over empty space reads as taller than the one at the foot,
      // which always has text running into it.
      setScrolled((was) => {
        const now = node.scrollTop > 1;
        return was === now ? was : now;
      });
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  // Driven by the column's own height rather than by how many words have been
  // revealed. A bubble grows through a 260ms transition, so between one word
  // and the next the page keeps getting taller — and a scroll that only fires
  // on the word falls behind and catches up in steps. That is the sawtooth.
  //
  // A `ResizeObserver` reports every frame the box actually changes, whatever
  // moved it: the transition, a new message, a resize. Following the size is
  // following the thing that is moving.
  //
  const column = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = column.current;
    const box = viewport.current;
    if (!node || !box) return;

    const observer = new ResizeObserver(() => {
      if (!following.current) return;
      box.scrollTop = box.scrollHeight;
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // What is on screen if there is a turn, and otherwise the last one there
  // was. Never a message of yours: this is for reading what you were asked.
  const lastSaid =
    turn?.text ??
    [...said].reverse().find((entry) => entry.from === "talkeo")?.text ??
    null;

  const placeholder = name
    ? t("placeholderNamed", { name })
    : t("placeholder");
  const canSend = written && !pending;

  // How much of the interview is behind you, counted in turns the assistant
  // has taken.
  //
  // ⚠ The total is the script's, not the service's: `flow.step` says
  // `talkeo_interview` for the whole thing, so there is nothing to ask. The
  // moment the stage travels in the flow this comes from there instead — a bar
  // that fills against a number the client made up is the one thing a progress
  // bar must not be.
  const saidByTalkeo =
    said.filter((entry) => entry.from === "talkeo").length + (turn ? 1 : 0);

  return (
    <div
      data-slot="chat-screen"
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* The same 44 as the panel's, so the two headers are one line across
          the screen. It names where you are and nothing else: every attempt at
          making this line do more work — greeting, encouraging, saying how
          long is left — read as the interface talking over the assistant, who
          is right below and is the one meant to be doing that. */}
      {/* The same measure as the composer at the other end, so the two things
          that frame the conversation share its width. */}
      <header className="flex h-11 shrink-0 items-center">
        <div className="mx-auto w-full max-w-3xl px-6">
          <ProgressBar
            position={saidByTalkeo}
            total={INTERVIEW_TURNS}
            label={t("title")}
          />
        </div>
      </header>

      {/* Kept as it is, not faded and not unmounted. The track outside closes
          over it, so covering is all that is needed — and a turn in flight has
          a clock and a playhead that unmounting would throw away, which on the
          way back would replay a sentence you already heard. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewport}
          className="scroll-quiet h-full overflow-y-auto"
        >
          {/* The space between messages lives on each one rather than in a
              `gap`, so an arriving message can take its own spacing with it as
              it grows. A gap belongs to the column and is already there before
              the message is, which is a 32px jump ahead of the message that
              was supposed to be arriving gently. */}
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

            {/* Nothing at all while the answer is on its way. A placeholder
                that appears and is then replaced is two arrivals for one
                message, and the swap is the part that reads as broken. */}
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

        {/* The transcript runs past both ends rather than stopping at them, so
            a line cut in half by an edge would read as a rendering fault.
            These let it go instead — one under the progress bar, one under the
            composer, the same height at both ends because an asymmetric pair
            reads as one of them being a mistake. */}
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

      {/* Outside the scrolling box rather than sticky inside it: sticky needs
          the box to be scrolled to stay put, and this one has to hold its
          place from the first frame, before there is anything to scroll.

          It never moves and never leaves. When the panel takes the screen the
          column is simply covered, and a second one appears inside the panel. */}
      {/* Off the floor rather than on it: flush to the bottom edge reads as
          the composer having fallen there. */}
      <div className="shrink-0 pb-5">
        <div className="mx-auto w-full max-w-3xl px-6">
          <Composer
            placeholder={placeholder}
            onSend={send}
            canSend={canSend}
          />
        </div>
      </div>

      {/* The one in the panel. Rendered into the panel's own foot rather than
          over the page, so it arrives, leaves and fades with everything else
          in there — a portal, because what it needs is the panel's DOM and the
          conversation's state, and those are in different trees. */}
      {dock
        ? createPortal(
            <div className="pointer-events-auto w-full max-w-xl">
              {/* One line of what was just said, and a way to read the rest.
                  Without it this is a place to talk into with no sign of who
                  is listening — and the answer to the exercise is usually in
                  the sentence that asked for it. */}
              {lastSaid ? (
                <LatestTurn label={t("latest")} text={lastSaid} />
              ) : null}

              {/* Positioned, and above. The card behind it is positioned too,
                  and a positioned element paints over a static one whatever
                  the order in the document — which is how the thing at the
                  back ends up covering the thing in front. */}
              <div className="relative z-10">
                <Composer
                  placeholder={placeholder}
                  onSend={send}
                  canSend={canSend}
                />
              </div>
            </div>,
            dock,
          )
        : null}
    </div>
  );
}

/**
 * The last thing Talkeo said, tucked behind the composer.
 *
 * Narrower than the composer and overlapped by it, so it reads as a card
 * behind the one you are using rather than as a second control stacked on top.
 * Collapsed it is one line; open, it grows upward and pushes nothing — the
 * composer is what the hand is on and it does not move.
 */
/** Longer than the row's own 320ms, so one settles inside the other. */
const REVEAL_MS = 460;

function LatestTurn({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-0 mx-6 -mb-5">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        data-slot="latest-turn"
        className={cn(
          "bg-surface-tertiary border-border w-full cursor-pointer rounded-2xl border",
          // Enough padding under the header to clear the composer overlapping
          // it, and no more: the rest was height the collapsed card did not
          // need.
          "pt-2 pb-6 text-left outline-none",
          "transition-colors duration-(--duration-control) ease-(--ease-standard)",
          "hover:border-border-strong focus-visible:border-border-strong",
        )}
      >
        <span className="flex items-center gap-2 px-4">
          <span className="text-text-secondary flex-1 truncate text-sm">
            {label}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={cn(
              "text-text-tertiary size-4 shrink-0",
              "transition-transform duration-(--duration-control) ease-(--ease-standard)",
              open ? "rotate-90" : "rotate-0",
            )}
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </span>

        {/* `minmax(0, …)` on both ends: a bare `0fr` keeps the track at the
            content's own minimum and the row never actually closes. */}
        <span
          className="grid transition-[grid-template-rows] duration-(--duration-highlight-out) ease-(--ease-standard)"
          style={{
            gridTemplateRows: open ? "minmax(0, 1fr)" : "minmax(0, 0fr)",
          }}
        >
          <span className="overflow-hidden">
            {/* The row opening only uncovers the text; on its own that reads
                as a shutter going up over something already there. Resolving
                out of blur alongside it reads as the sentence arriving, which
                is how the same sentence arrives in the column.

                Slower than the row and starting with it, so the text is still
                settling when the height has finished — the two overlap instead
                of finishing together on a hard stop. */}
            <span
              className="text-foreground block px-4 pt-2 text-[15px] leading-[1.6] text-pretty"
              style={{
                opacity: open ? 1 : 0,
                filter: open ? "blur(0px)" : "blur(5px)",
                transition: `opacity ${REVEAL_MS}ms var(--ease-standard), filter ${REVEAL_MS}ms var(--ease-standard)`,
              }}
            >
              {text}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

/**
 * A message taking up its room instead of appearing in it.
 *
 * Fading in was only half of it: the box arrived at its full first-line height
 * in one frame, so everything above jumped 56 pixels while the text underneath
 * politely faded. Growing from nothing puts the two on the same clock.
 *
 * It only has to cover the first line — from there `TurnText` grows on its own
 * as the voice reaches each one, and `1fr` hands the height back to it.
 */
function Arriving({ children }: { children: ReactNode }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
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
        <div className="pt-8">{children}</div>
      </div>
    </div>
  );
}

/** One declaration, so a played turn and a settled one cannot drift apart. */
const TALKEO_BODY = "text-foreground text-[18px] leading-[1.7]";

/** One shape and one fill for both sides; only the edge they sit against
 *  differs, and Talkeo signing its own. */
function Bubble({
  from,
  children,
  arriving = true,
}: {
  from: "talkeo" | "you";
  children: ReactNode;
  /** False once it is only history: it already faded in when it was new. */
  arriving?: boolean;
}) {
  return (
    <div
      data-slot="bubble"
      data-from={from}
      className={cn(
        // `w-fit`, so it takes the width of what is in it. Its content is a
        // block, and a block in a column stretches to the full track unless it
        // is told otherwise — which is how a two-word answer ends up as wide
        // as the page.
        //
        // Capped in ch rather than in a share of the column, so the measure
        // stays readable whatever the container does. 70ch is the ceiling for
        // reading, but at this size it is nearly the whole track — the bubble
        // then reaches the edge and stops reading as a bubble at all. This is
        // short of that on purpose: it leaves the column visibly wider than
        // the message sitting in it.
        "w-fit max-w-[56ch] rounded-2xl px-4 py-2.5",
        // One step apart on the same surface ramp, not two unrelated fills.
        // Talkeo carries the reading, so it sits closest to the page; your own
        // line is short and reads as an interruption, so it comes forward.
        from === "you"
          ? "bg-surface-tertiary ml-auto"
          : "bg-surface-secondary mr-auto",
      )}
      style={
        arriving
          ? {
              animation: `message-in ${MESSAGE_IN_MS}ms var(--ease-standard) both`,
            }
          : undefined
      }
    >
      {children}
      {from === "talkeo" ? (
        <p className="text-text-tertiary mt-1.5 text-xs font-medium">Talkeo</p>
      ) : null}
    </div>
  );
}

/**
 * A turn that has finished, drawn exactly the way it was drawn while it played.
 *
 * Same component, same spans, same measurement — only fully revealed. A plain
 * paragraph here would be a different tree holding rearranged text, so its
 * height would not have to match the one the clip had just settled on, and the
 * handover is where a jump would land.
 */
function TalkeoSaid({ text }: { text: string }) {
  const lines = splitLines(text);
  const words = lines.reduce((total, line) => total + line.words.length, 0);

  return (
    <Bubble from="talkeo" arriving={false}>
      <TurnText
        lines={lines}
        revealedWords={words}
        className={TALKEO_BODY}
      />
    </Bubble>
  );
}

function YouSaid({ text }: { text: string }) {
  return (
    <Bubble from="you">
      <p className="text-foreground text-[18px] leading-[1.7] wrap-anywhere">
        {text}
      </p>
    </Bubble>
  );
}
