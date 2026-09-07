"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { EntryMode } from "@/lib/session/entry-answers";
import { unlockVoice } from "@/lib/talkeo/voice";

/**
 * The two answers.
 *
 * Side by side they would read as equivalent; stacked, with one solid and one
 * outlined, the pair says which one to take without a word of copy spent on
 * saying it. Speaking is the one we want, so speaking is the solid one and it
 * goes on top.
 *
 * Choosing is submitting. There is no Continue after, because there is nothing
 * left to decide.
 */
export function ModeChoice({
  action,
  voice,
  text,
}: {
  action: (mode: EntryMode) => Promise<void>;
  voice: string;
  text: string;
}) {
  const [pending, startTransition] = useTransition();

  const choose = (mode: EntryMode) => {
    unlockVoice();
    startTransition(() => action(mode));
  };

  return (
    // Both share one width rather than sizing to their own labels: stacked
    // controls of different widths read as a list of links, and a fixed column
    // reads as a decision with two answers.
    <div className="flex w-full flex-col gap-3">
      <Button size="md" onClick={() => choose("voice")} disabled={pending}>
        <Microphone />
        {voice}
      </Button>
      <Button
        size="md"
        variant="secondary"
        onClick={() => choose("text")}
        disabled={pending}
      >
        <Keyboard />
        {text}
      </Button>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      {children}
    </svg>
  );
}

function Microphone() {
  return (
    <Icon>
      <rect x="9.25" y="3" width="5.5" height="11" rx="2.75" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    </Icon>
  );
}

/**
 * Four keys and a space bar, not the twelve a real keyboard has: at 20px the
 * full grid closes up into a rectangle of noise. What has to survive is the
 * silhouette — a wide box with a long bar along the bottom.
 */
function Keyboard() {
  return (
    <Icon>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
    </Icon>
  );
}
