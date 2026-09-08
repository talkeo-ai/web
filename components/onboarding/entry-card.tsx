"use client";

import { Keyboard, Mic } from "lucide-react";
import { useState, useTransition } from "react";

import {
  answerMode,
  answerName,
} from "@/app/[locale]/(app)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NAME_MAX } from "@/lib/onboarding/entry";
import type { EntryMode } from "@/lib/session/entry-answers";
import { unlockVoice } from "@/lib/talkeo/voice";
import { cn } from "@/lib/utils";

/**
 * The two things the entrance asks, answered beside the conversation.
 *
 * They were a screen each. They are turns now — Talkeo asks, and this is where
 * the answer goes — which is the same shape every question after them has, and
 * the reason there is no longer a step of the run that is a form.
 *
 * Answering either one is also a press, and the first press is what claims
 * audio playback for the rest of the run.
 */
/**
 * The card arrives a part at a time: the question, then what answers it, then
 * the way to send it. Everything at once is a screen appearing; one after
 * another is a screen being laid out in front of you, and it puts the question
 * in front of the eye before the field it belongs to.
 *
 * Each part rises the last ten pixels into place on a decelerating curve. Two
 * reasons it is not a plain fade: a fade has no direction, so three of them in
 * a row read as three separate events rather than as one thing being laid out;
 * and an element that slows as it lands reads as having weight, which is most
 * of what separates something built from something rendered.
 *
 * The travel is long against the step, so a part is still settling while the
 * next one starts — they overlap into one movement instead of queuing.
 *
 * The first delay is what the question on its way out is still using.
 */
const AFTER_THE_QUESTION_MS = 230;
const STEP_MS = 110;
const ARRIVE_MS = 520;

/** And how long it takes to go once it has been answered. */
const LEAVE_MS = 280;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function arriving(step: number): React.CSSProperties {
  const delay = AFTER_THE_QUESTION_MS + step * STEP_MS;
  return {
    animation: `rise-in ${ARRIVE_MS}ms var(--ease-entrance) ${delay}ms both`,
  };
}

export function EntryCard({
  asks,
  onAnswered,
}: {
  asks: "name" | "mode";
  /**
   * The answer, in the words it goes into the transcript as. Taking the
   * conversation on is the caller's business: the answer is the visitor's
   * turn, and a turn is owed.
   */
  onAnswered: (said: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [leaving, setLeaving] = useState(false);

  /**
   * Answers, and goes.
   *
   * The card leaves before the conversation is told, rather than being taken
   * off screen by the next turn arriving underneath it: an answered question
   * that is still there while the reply loads reads as not having registered.
   *
   * The write starts at once and the fade runs alongside it, so the wait is
   * the slower of the two rather than the sum.
   */
  const answer = (said: string, write: () => Promise<void>) => {
    setLeaving(true);
    startTransition(async () => {
      unlockVoice();
      await Promise.all([write(), wait(LEAVE_MS)]);
      onAnswered(said);
    });
  };

  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full max-w-md flex-col justify-center px-6 py-8",
        "transition-opacity ease-linear",
        leaving && "pointer-events-none opacity-0",
      )}
      style={{ transitionDuration: `${LEAVE_MS}ms` }}
    >
      {/* The card says what it is taking. Talkeo asked it in the conversation
          and this is a different surface: without a heading it is a field with
          no question on it.

          It has the screen to itself while it is up, so it is sized for that
          rather than for a column with a conversation running past it. */}
      <h2
        style={arriving(0)}
        className="font-heading pb-6 text-center text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl"
      >
        {asks === "name" ? "¿Cuál es tu nombre?" : "¿Cómo querés responder?"}
      </h2>

      {asks === "name" ? (
        <NameField
          pending={pending}
          onSubmit={(name) =>
            answer(name.trim(), () => answerName(name))
          }
        />
      ) : (
        <ModeChoice
          pending={pending}
          onChoose={(mode) =>
            answer(mode === "voice" ? "Hablar" : "Escribir", () =>
              answerMode(mode),
            )
          }
        />
      )}
    </div>
  );
}

function NameField({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <form
      className="flex w-full flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <Input
        autoFocus
        autoComplete="given-name"
        maxLength={NAME_MAX}
        placeholder="Tu nombre"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-12 rounded-xl text-center"
        style={arriving(1)}
      />
      <Button
        type="submit"
        size="md"
        className="w-full"
        style={arriving(2)}
        disabled={name.trim().length === 0 || pending}
      >
        Continuar
      </Button>
    </form>
  );
}

/**
 * Speaking is the one we want, so speaking is the solid one and it goes on
 * top. Stacked rather than side by side: side by side they read as
 * equivalent.
 */
function ModeChoice({
  pending,
  onChoose,
}: {
  pending: boolean;
  onChoose: (mode: EntryMode) => void;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-3")}>
      <Button
        size="md"
        className="w-full"
        style={arriving(1)}
        disabled={pending}
        onClick={() => onChoose("voice")}
      >
        <Mic className="size-5 shrink-0" aria-hidden />
        Activar micrófono
      </Button>
      <Button
        size="md"
        variant="secondary"
        className="w-full"
        style={arriving(2)}
        disabled={pending}
        onClick={() => onChoose("text")}
      >
        <Keyboard className="size-5 shrink-0" aria-hidden />
        Prefiero escribir
      </Button>
    </div>
  );
}
