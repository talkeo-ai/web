"use client";

import { Mic, MicOff, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { composerAction } from "@/lib/onboarding/outbox";
import { cn } from "@/lib/utils";

/**
 * Where the answer is typed, and where the call is joined and left.
 *
 * Enter sends and Shift+Enter breaks the line. A textarea rather than an input
 * because an answer here can run to a paragraph and a single line that scrolls
 * sideways hides what you just wrote. It grows with what is in it up to a
 * ceiling and then scrolls; past that the composer starts eating the
 * conversation it belongs to.
 *
 * **Typing and sending are gated separately.** While Talkeo is still talking
 * there is nothing to send to yet, but taking the keyboard away is not how a
 * conversation works — you get to compose your answer while the other person
 * finishes.
 *
 * The controls on the right are one slot plus, in a call, the mute. One slot
 * because sending and speaking are never both the thing to press: with the field
 * empty there is nothing to send, and with a sentence in it speaking would throw
 * the sentence away. In a call with the field empty, what is offered is leaving
 * the call — not sending nothing.
 */

/**
 * One line of the field is exactly as tall as the button beside it: 24px of
 * leading plus 6px above and below is the button's 36. Without pinning the
 * leading the field comes out short of it and the icon rides high.
 */
const LINE_HEIGHT_PX = 24;
const MAX_ROWS = 6;

export function Composer({
  placeholder,
  inCall,
  muted,
  canSend,
  onSend,
  onCall,
  onHangUp,
  onMute,
}: {
  placeholder: string;
  inCall: boolean;
  muted: boolean;
  /** Whether there is anything to send it to yet. */
  canSend: boolean;
  onSend: (text: string) => void;
  onCall: () => void;
  onHangUp: () => void;
  onMute: (on: boolean) => void;
}) {
  const [text, setText] = useState("");
  const action = composerAction({ text, inCall });
  const ready = action === "send" && canSend;

  const act = () => {
    if (action === "call") return onCall();
    if (action === "hang up") return onHangUp();
    if (!ready) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") return event.currentTarget.blur();
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    act();
  };

  return (
    <div
      data-slot="composer"
      className={cn(
        "bg-surface-secondary flex items-end gap-1 rounded-[1.4rem] py-2 pr-2 pl-4",
        // The same three states as `ui/input`, on the same tokens: the two are
        // the only places anyone types, and a field that changes character
        // between screens reads as two different products.
        "border-border border",
        "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
        "hover:border-border-strong focus-within:border-border-strong",
      )}
    >
      <textarea
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        data-slot="composer-field"
        className={cn(
          "text-foreground placeholder:text-text-tertiary field-sizing-content",
          "flex-1 resize-none bg-transparent py-1.5 text-[18px] outline-none",
        )}
        style={{
          lineHeight: `${LINE_HEIGHT_PX}px`,
          maxHeight: `${MAX_ROWS * LINE_HEIGHT_PX + 16}px`,
        }}
      />

      {inCall ? (
        <button
          type="button"
          onClick={() => onMute(!muted)}
          data-slot="composer-mute"
          data-muted={muted ? "true" : "false"}
          aria-label={muted ? "Activar el micrófono" : "Silenciar el micrófono"}
          className={cn(
            "text-text-secondary grid size-9 shrink-0 place-items-center rounded-full",
            "cursor-pointer outline-none",
            "transition-[color,background-color] duration-(--duration-control) ease-(--ease-standard)",
            "hover:text-foreground hover:bg-surface-tertiary",
            "focus-visible:ring-ring focus-visible:ring-2",
          )}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
      ) : null}

      <button
        type="button"
        onClick={act}
        disabled={action === "send" && !ready}
        data-slot="composer-action"
        data-action={action}
        aria-label={LABELS[action]}
        // Plain, like every other affordance in this field. The images with a
        // filled circle were logic references — which control is offered when —
        // and not a look to copy.
        className={cn(
          "text-foreground grid size-9 shrink-0 place-items-center rounded-full",
          "cursor-pointer outline-none",
          "transition-[opacity,background-color] duration-(--duration-control) ease-(--ease-standard)",
          "hover:bg-surface-tertiary focus-visible:ring-ring focus-visible:ring-2",
          "disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        {action === "send" ? (
          <SendArrow />
        ) : action === "hang up" ? (
          <X className="size-5" />
        ) : (
          <Waveform />
        )}
      </button>
    </div>
  );
}

const LABELS = {
  send: "Enviar",
  call: "Hablar",
  "hang up": "Salir del modo hablar",
} as const;

/**
 * The return key, which is also how you send. Drawn rather than typed: the font
 * subset has no glyph for it.
 */
function SendArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      <path d="M12 19V5m0 0-6 6m6-6 6 6" />
    </svg>
  );
}

/**
 * Six bars, tallest in the middle and mirrored outward, so the shape reads as a
 * voice rather than as a chart. Every bar is a rounded rect on the same 4px
 * pitch; only the height and the y differ, and both come off one number.
 */
const BAR_HEIGHTS = [6, 10, 16, 10, 16, 6];
const BAR_WIDTH = 1.2;
const BAR_PITCH = 4;
const BOX = 21.2;

function Waveform() {
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      fill="none"
      aria-hidden
      className="size-5 overflow-visible"
    >
      {BAR_HEIGHTS.map((height, index) => (
        <rect
          key={index}
          x={index * BAR_PITCH}
          y={(BOX - height) / 2}
          width={BAR_WIDTH}
          height={height}
          rx={BAR_WIDTH / 2}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
