"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Composer } from "@/components/onboarding/composer";
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

function atBottom(): boolean {
  return (
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - NEAR_BOTTOM_PX
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
}: {
  name: string | null;
  current: FetchTurn;
  next: FetchTurn;
}) {
  return (
    <MarkTargets>
      <Conversation name={name} current={current} next={next} />
    </MarkTargets>
  );
}

function Conversation({
  name,
  current,
  next,
}: {
  name: string | null;
  current: FetchTurn;
  next: FetchTurn;
}) {
  const t = useTranslations("onboarding.chat");
  const router = useRouter();

  const [said, setSaid] = useState<Said[]>([]);
  const [turn, setTurn] = useState<TalkeoTurn | null>(null);
  const [step, setStep] = useState<Step | null>(null);
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

  const leaving = step !== null && step !== "talkeo_interview";

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
      ...(turn ? [settled(turn)] : []),
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
    setStep(result.step);
  };

  const send = (text: string) => {
    // Sending is the one thing that takes the view back, wherever they were
    // reading: you asked for the answer, so you get to see it arrive.
    following.current = true;

    if (leaving) {
      router.refresh();
      return;
    }
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
      setStep(result.step);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Following the conversation is the default and stays that way until the
  // person scrolls up to read. A programmatic scroll ends at the bottom too,
  // so following keeps following without any flag to unset.
  const following = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      following.current = atBottom();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
  // The bottom of the page and not a marker in the column: the composer is
  // sticky, so a marker above it lands under the composer and hides the line
  // that just arrived.
  const column = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = column.current;
    if (!node) return;

    const observer = new ResizeObserver(() => {
      if (!following.current) return;
      window.scrollTo({ top: document.documentElement.scrollHeight });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <main
      data-slot="chat-screen"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6"
    >
      <div ref={column} className="flex flex-1 flex-col gap-8 py-10">
        {said.map((entry) =>
          entry.from === "you" ? (
            <YouSaid key={entry.id} text={entry.text} />
          ) : (
            <TalkeoSaid key={entry.id} text={entry.text} />
          ),
        )}

        {/* Nothing at all while the answer is on its way. A placeholder that
            appears and is then replaced is two arrivals for one message, and
            the swap is the part that reads as broken. */}
        {turn ? (
          <Bubble from="talkeo">
            <TurnText
              key={turn.turn_id}
              lines={lines}
              revealedWords={revealedWords}
              className={TALKEO_BODY}
            />
          </Bubble>
        ) : null}

      </div>

      <div className="bg-background sticky bottom-0 pb-6">
        <Composer
          placeholder={
            name ? t("placeholderNamed", { name }) : t("placeholder")
          }
          onSend={send}
          canSend={written && !pending}
        />
      </div>
    </main>
  );
}

/** A turn that has finished playing, flattened to the text it said. */
function settled(turn: TalkeoTurn): Said {
  return { id: turn.turn_id, from: "talkeo", text: turn.text };
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
