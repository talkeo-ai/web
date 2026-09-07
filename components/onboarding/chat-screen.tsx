"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createPortal } from "react-dom";

import { ChatHeader } from "@/components/onboarding/chat/chat-header";
import { LatestTurn } from "@/components/onboarding/chat/latest-turn";
import { Transcript } from "@/components/onboarding/chat/transcript";
import { Composer } from "@/components/onboarding/composer";
import { MarkTargets } from "@/components/talkeo/mark-target";
import type { Step } from "@/core/contracts";
import {
  useConversation,
  type FetchTurn,
} from "@/lib/onboarding/use-conversation";
import { useFollowingScroll } from "@/lib/onboarding/use-following-scroll";
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
   * across the page reads as having been taken from you and put back somewhere
   * else. Two, each appearing where it belongs and leaving with whatever it
   * belongs to, read as two ways of doing the same thing.
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

  // The scroll first, so the conversation can be handed its `follow` — sending
  // is the one thing that takes the view back to the foot, wherever the person
  // was reading.
  const { viewport, column, scrolled, follow } = useFollowingScroll();
  const { said, turn, pending, send, lines, revealedWords, written } =
    useConversation({ current, next, onStep, onSend: follow });

  const placeholder = name
    ? t("placeholderNamed", { name })
    : t("placeholder");
  const canSend = written && !pending;

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

  // Only used by the panel's composer, and only what Talkeo said: this is for
  // re-reading what you were asked, not what you answered.
  const lastSaid =
    turn?.text ??
    [...said].reverse().find((entry) => entry.from === "talkeo")?.text ??
    null;

  return (
    <div data-slot="chat-screen" className="flex min-h-0 flex-1 flex-col">
      <ChatHeader
        position={position}
        total={INTERVIEW_STAGES}
        label={t("title")}
      />

      <Transcript
        said={said}
        turn={turn}
        lines={lines}
        revealedWords={revealedWords}
        scrolled={scrolled}
        viewport={viewport}
        column={column}
      />

      {/* Outside the scrolling box rather than sticky inside it: sticky needs
          the box to be scrolled to stay put, and this one has to hold its place
          from the first frame, before there is anything to scroll.

          It never moves and never leaves. When the panel takes the screen the
          column is simply covered, and a second one appears inside the panel. */}
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
          over the page, so it arrives, leaves and fades with everything else in
          there — a portal, because what it needs is the panel's DOM and the
          conversation's state, and those are in different trees. */}
      {dock
        ? createPortal(
            <div className="pointer-events-auto w-full max-w-xl">
              {/* One line of what was just said, and a way to read the rest.
                  Without it this is a place to talk into with no sign of who is
                  listening — and the answer to the exercise is usually in the
                  sentence that asked for it. */}
              {lastSaid ? (
                <LatestTurn label={t("latest")} text={lastSaid} />
              ) : null}

              {/* Positioned, and above. The card behind it is positioned too,
                  and a positioned element paints over a static one whatever the
                  order in the document — which is how the thing at the back
                  ends up covering the thing in front. */}
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
