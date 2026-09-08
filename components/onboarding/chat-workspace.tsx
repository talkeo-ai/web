"use client";

import { useState } from "react";

import { ChatScreen } from "@/components/onboarding/chat-screen";
import type { Step, TalkeoTurn } from "@/core/contracts";
import type { EntryMode } from "@/lib/session/entry-answers";

type FetchTurn = () => Promise<{ turn: TalkeoTurn; step: Step } | null>;

/**
 * The run, on one screen.
 *
 * There is no second column any more. Work used to open in a panel beside the
 * conversation, and beside is where two things compete: the exercise had to be
 * read while the chat scrolled next to it, and on a wide screen the pair was
 * two half-empty halves.
 *
 * So the screen has one thing on it at a time. What the run is doing right now
 * covers the conversation, and the conversation is a gesture away underneath —
 * which is also what makes the same layout work on a phone, where a panel was
 * never going to fit.
 *
 * All this holds is where the service says the run is. Everything else about
 * what that means is the conversation's.
 */
export function ChatWorkspace({
  name,
  mode,
  asks,
  current,
  next,
}: {
  name: string | null;
  /** How they said they want to answer. Null until they have said. */
  mode: EntryMode | null;
  /** What the entrance still has to ask, if anything. */
  asks: "name" | "mode" | null;
  current: FetchTurn;
  next: FetchTurn;
}) {
  const [step, setStep] = useState<Step | null>(null);

  return (
    // A definite height, not a minimum: a box only overflows against one, and
    // what is inside scrolls on its own. `dvh` rather than `vh` because on a
    // phone the browser chrome moves and `vh` does not.
    <div data-slot="chat-workspace" className="flex h-dvh flex-col">
      <ChatScreen
        name={name}
        mode={mode}
        asks={asks}
        step={step}
        current={current}
        next={next}
        onStep={setStep}
      />
    </div>
  );
}
