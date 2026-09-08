"use client";

import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  answerItem,
  nextItem,
  reportItemView,
} from "@/app/[locale]/(app)/onboarding/actions";
import { ChatHeader } from "@/components/onboarding/chat/chat-header";
import { SpokenTurn } from "@/components/onboarding/chat/spoken-turn";
import { Transcript } from "@/components/onboarding/chat/transcript";
import { Composer } from "@/components/onboarding/composer";
import { EntryCard } from "@/components/onboarding/entry-card";
import { ItemsScreen } from "@/components/onboarding/items/items-screen";
import { ScopeCard, SCOPE_CONTROL } from "@/components/onboarding/scope-card";
import { StageHeading } from "@/components/onboarding/stage-heading";
import { MarkTargets } from "@/components/talkeo/mark-target";
import { useRouter } from "@/lib/i18n/navigation";
import { entryHoldMs } from "@/lib/onboarding/motion";
import { cn } from "@/lib/utils";
import type { Step } from "@/core/contracts";
import {
  useConversation,
  type FetchTurn,
} from "@/lib/onboarding/use-conversation";
import { useFollowingScroll } from "@/lib/onboarding/use-following-scroll";
import type { EntryMode } from "@/lib/session/entry-answers";
import { INTERVIEW_STAGES, stageOf } from "@/lib/onboarding/stage";

/**
 * The conversation, assembled.
 *
 * What it *is* lives in `useConversation`, how it follows itself down lives in
 * `useFollowingScroll`, and what it looks like lives in `chat/`. This puts the
 * three together and decides where the second composer goes.
 *
 * Nothing here scripts the assistant. Which turn comes next, and what it points
 * at, is the service's answer; this renders it.
 */
export function ChatScreen({
  name,
  mode,
  asks,
  step,
  current,
  next,
  onStep,
}: {
  name: string | null;
  /** How they said they want to answer. Null until they have said. */
  mode?: EntryMode | null;
  /** What the entrance still has to ask, if anything. */
  asks?: "name" | "mode" | null;
  /** Where the service says the run is. Null until it has said. */
  step?: Step | null;
  current: FetchTurn;
  next: FetchTurn;
  onStep?: (step: Step) => void;
}) {
  return (
    <MarkTargets>
      <Conversation
        name={name}
        mode={mode}
        asks={asks}
        step={step}
        current={current}
        next={next}
        onStep={onStep}
      />
    </MarkTargets>
  );
}

function Conversation({
  name,
  mode,
  asks,
  step,
  current,
  next,
  onStep,
}: {
  name: string | null;
  /** How they said they want to answer. Null until they have said. */
  mode?: EntryMode | null;
  asks?: "name" | "mode" | null;
  step?: Step | null;
  current: FetchTurn;
  next: FetchTurn;
  onStep?: (step: Step) => void;
}) {
  const t = useTranslations("onboarding.chat");
  const router = useRouter();

  // The scroll first, so the conversation can be handed its `follow` — sending
  // is the one thing that takes the view back to the foot, wherever the person
  // was reading.
  const { viewport, column, scrolled, follow } = useFollowingScroll();
  const { said, turn, pending, send, lines, revealedWords, written } =
    useConversation({ current, next, onStep, onSend: follow });

  const placeholder = name ? t("placeholderNamed", { name }) : t("placeholder");
  const canSend = written && !pending;
  /**
   * What the run is doing right now, if it is doing something.
   *
   * The measuring steps and the entrance both take the screen: one thing at a
   * time, covering the conversation, with the conversation a gesture away
   * underneath. The transcript keeps being written the whole time, so nothing
   * said up here is lost — it is all there the moment the cover comes off.
   */
  const measuring = step === "items" || step === "verification" ? step : null;

  // Whether this turn is offering a control, and which. It is the turn that
  // decides — the same rule as every other mark — so a question comes with
  // buttons because the service said so, never because the client guessed.
  const offersScope =
    turn?.marks.some((mark) => mark.target === SCOPE_CONTROL) ?? false;

  /**
   * Whether the conversation has been pulled up over it.
   *
   * The two states are always both reachable, in either direction: the focused
   * one is what the run is doing and the conversation is the record of it, and
   * there is no moment where you should be stuck in one. So this is a plain
   * toggle and the control for it never leaves.
   */
  const [open, setOpen] = useState(false);

  /**
   * Whether the focus offers a way to type.
   *
   * Somebody who said they would speak did not ask for a keyboard, and putting
   * one under the question is telling them the answer they gave was wrong. In
   * the conversation it is always there — that is a chat, and a chat you cannot
   * type into is a transcript.
   */
  const typing = open || (mode !== "voice" && !asks);

  // The question stays up for a beat after its last word, and only then does
  // the control replace it.
  //
  // What is stored is which turn has had its beat, not a flag: a flag would
  // have to be cleared when the next question arrives, and clearing it is a
  // frame of the new question with the old one's control already on it.
  const [beatGiven, setBeatGiven] = useState<string | null>(null);
  const read = beatGiven !== null && beatGiven === turn?.turn_id;

  /**
   * What answers this turn, if anything does.
   *
   * ⚠ The question only leaves once there is something to put in its place.
   * Tied to the beat alone, a turn that offers no control faded out into an
   * empty screen — and that is most turns.
   */
  const control = asks
    ? "entry"
    : offersScope
      ? "scope"
      : measuring
        ? "items"
        : null;

  /** The question has been said and its beat given: the control can land. */
  const ready =
    control !== null && (read || (control === "items" && written));

  useEffect(() => {
    const id = turn?.turn_id;
    if (!written || !id) return;

    const timer = setTimeout(
      () => setBeatGiven(id),
      entryHoldMs(revealedWords),
    );
    return () => clearTimeout(timer);
    // The beat is set when the turn lands and does not restart as the count
    // settles, which by then it already has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [written, turn?.turn_id]);

  // How far along the interview is.
  //
  // The turn says so when it says so, and until then the number of turns the
  // assistant has taken stands in for it. The two are not the same measure,
  // which is why the stage wins whenever there is one — and why it is kept
  // rather than read fresh each render: a turn that reports no stage must not
  // drop the bar back to counting.
  const [stage, setStage] = useState<number | null>(null);
  const reported = stageOf(turn);
  if (reported !== null && (stage === null || reported > stage)) {
    setStage(reported);
  }

  const turnsTaken =
    said.filter((entry) => entry.from === "talkeo").length + (turn ? 1 : 0);
  const position = Math.min(stage ?? turnsTaken, INTERVIEW_STAGES);

  return (
    <div data-slot="chat-screen" className="flex min-h-0 flex-1 flex-col">
      <ChatHeader
        position={position}
        total={INTERVIEW_STAGES}
        label={t("title")}
      />

      {/* Clipped, because the conversation waits one screen below the bottom
          edge and slides up from there. Without this it hangs out under the
          foot of the page, which is the chat visible where nothing should
          be. */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* What the run is doing: the turn as it is being said, and then
            whatever answers it. It covers the conversation and leaves the
            progress bar alone, so the run still reads as being somewhere.

            Two phases on one surface. They cross rather than cut — the question
            fades as the control arrives, both stacked on the same box so
            neither has to move to make room for the other. */}
        <div
          data-slot="focus-layer"
          className="bg-background absolute inset-0 z-10"
        >
          {/* Both phases carry the header's height as bottom padding, which
                lifts what they centre by half of it. The layer starts under
                the progress bar, so without this everything inside it is
                centred in the room left over rather than on the screen. */}
          <div
            className={cn(
              // Linear on the way out. An eased fade has a moment where it
              // barely moves, and on text that reads as hesitating; a flat
              // one just gets quieter until it is gone.
              "absolute inset-0 flex flex-col pb-11 transition-opacity duration-300 ease-linear",
              ready && "pointer-events-none opacity-0",
            )}
          >
            {/* Keyed by the turn, so the pen starts over. Kept across turns
                  it would still be at the end of the last sentence, and the
                  next question would arrive already written. */}
            <SpokenTurn
              key={turn?.turn_id ?? "none"}
              lines={lines}
              revealedWords={revealedWords}
            />
          </div>

          {ready ? (
            <div
              // Whatever is on the layer has no entrance of its own: its
              // parts arrive one after another and that stagger is the
              // entrance. Fading the box in as well would be two arrivals
              // for one thing.
              className="absolute inset-0 flex flex-col pb-11"
            >
              {control === "entry" && asks ? (
                <EntryCard
                  asks={asks}
                  onAnswered={(saidNow) => {
                    // The cookie decides which control comes next, and only
                    // the server can read it back.
                    router.refresh();
                    send(saidNow);
                  }}
                />
              ) : control === "scope" ? (
                <ScopeCard onAnswered={send} />
              ) : control === "items" && measuring ? (
                <ItemsScreen
                  heading={<StageHeading stage={measuring} />}
                  next={nextItem}
                  answer={answerItem}
                  report={reportItemView}
                  onStep={onStep}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* The conversation, pulled up over whatever is covering it.
            It slides rather than fades: it is the same thing that was
            underneath all along, and something that was already there arrives
            by moving, not by materialising. */}
        <div
          data-slot="transcript-sheet"
          className={cn(
            "bg-background absolute inset-0 z-20 flex flex-col",
            "transition-transform",
            open ? "translate-y-0" : "translate-y-full",
          )}
          style={{
            // A sheet travelling the whole height needs a longer, gentler
            // curve than a control does: an expo-out covers most of the screen
            // in its first fifth, which on something this size reads as a
            // slam. This one leaves quickly enough to feel answered and lands
            // slowly enough to feel placed.
            transitionDuration: "480ms",
            transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          }}
          aria-hidden={open ? undefined : true}
        >
          <Transcript
            said={said}
            turn={turn}
            lines={lines}
            revealedWords={revealedWords}
            scrolled={scrolled}
            viewport={viewport}
            column={column}
          />
        </div>
      </div>

      {/* The foot: the way between the two states, and — when there is one to
          offer — a way to talk.

          The switch is always here, in both states and in the same place. It
          is the one control that must not move: it is how you get back, and a
          control that comes and goes is one you have to find again every time
          you need it. */}
      <div className="relative z-30 flex shrink-0 flex-col items-center pb-5">
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className="text-text-secondary hover:text-foreground focus-visible:ring-ring flex cursor-pointer flex-col items-center gap-0.5 rounded-md py-1 text-[13px] font-medium transition-colors duration-(--duration-control) ease-(--ease-standard) outline-none focus-visible:ring-2"
        >
          <ChevronUp
            className={cn(
              "size-4 transition-transform duration-(--duration-control) ease-(--ease-standard)",
              open && "rotate-180",
            )}
            aria-hidden
          />
          {open ? t("hideChat") : t("showChat")}
        </button>

        {/* Outside the scrolling box rather than sticky inside it: sticky needs
            the box to be scrolled to stay put, and this has to hold its place
            from the first frame, before there is anything to scroll.

            ⚠ Its height is animated, never switched. Mounted and unmounted it
            goes from sixty pixels to none in a frame, and everything above it
            — the switch most of all — jumps by that much at the same moment
            the conversation is sliding past. Given a duration, the switch
            travels instead of teleporting, and the two movements read as one.

            `minmax(0, …)` at both ends: a bare `0fr` stops at the content's own
            minimum and the row never actually closes.

            See `typing` for where it is usable at all. */}
        <div
          className="grid w-full max-w-3xl transition-[grid-template-rows] duration-(--duration-highlight-out) ease-(--ease-entrance)"
          style={{
            gridTemplateRows: typing ? "minmax(0, 1fr)" : "minmax(0, 0fr)",
          }}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "pt-2 pr-4 pl-6 transition-opacity duration-(--duration-highlight-out) ease-(--ease-standard)",
                typing ? "opacity-100" : "opacity-0",
              )}
              inert={!typing}
            >
              <Composer
                placeholder={placeholder}
                onSend={send}
                canSend={canSend}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
