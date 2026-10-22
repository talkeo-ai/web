"use client";

import { Mic, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * An invitation to answer out loud, pinned over the composer's speak button.
 *
 * It comes up once the first message has been written and said, and points at
 * the control it is about rather than covering the screen: a dialog in the
 * first second of the conversation is an obstacle, and this one teaches where
 * the microphone lives (Joaquin, 22/oct, to see how it looks).
 *
 * Pressing it is pressing the speak button. Closing it, typing, or the
 * conversation moving on puts it away for good.
 */
export function MicHint({
  text,
  close,
  onCall,
  onClose,
}: {
  text: string;
  close: string;
  onCall: () => void;
  onClose: () => void;
}) {
  return (
    <div
      data-slot="mic-hint"
      className="mic-hint absolute right-0 bottom-full mb-2.5 flex items-center"
    >
      <div
        className={cn(
          "bg-cta-face text-cta-face-text relative flex items-center rounded-xl shadow-raised",
          "text-[14px] font-medium",
        )}
      >
        <button
          type="button"
          onClick={onCall}
          className="focus-key:ring-ring flex cursor-pointer items-center gap-2 rounded-l-xl py-2 pr-1 pl-3 outline-none focus-key:ring-2"
        >
          <Mic className="size-4" strokeWidth={2.25} />
          {text}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={close}
          className="focus-key:ring-ring grid size-8 cursor-pointer place-items-center rounded-r-xl opacity-60 outline-none hover:opacity-100 focus-key:ring-2"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
        {/* The tail, over the speak button: the composer's right padding plus
            half the button. */}
        <span
          aria-hidden
          className="bg-cta-face absolute -bottom-1 right-[22px] size-2.5 rotate-45 rounded-[2px]"
        />
      </div>
    </div>
  );
}
