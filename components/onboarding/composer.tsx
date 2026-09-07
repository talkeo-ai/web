"use client";

import { useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * Where the answer is typed.
 *
 * Enter sends and Shift+Enter breaks the line, which is the convention
 * everywhere this shape appears — and a textarea rather than an input because
 * an answer here can run to a paragraph and a single line that scrolls
 * sideways hides what you just wrote.
 *
 * It grows with what is in it up to a ceiling, then scrolls. Past that the
 * composer would start eating the conversation it belongs to.
 *
 * The button on the right is the microphone until there is something to send,
 * and then it is send. One slot, because the two are never both the thing to
 * press: with the field empty there is nothing to send, and with a sentence in
 * it speaking would throw the sentence away.
 *
 * Typing and sending are gated separately. While the assistant is still
 * talking there is nothing to send it to yet, but taking the keyboard away is
 * not how a conversation works — you get to compose your answer while the
 * other person finishes.
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
  onSend,
  disabled = false,
  canSend = true,
}: {
  placeholder: string;
  onSend: (text: string) => void;
  /** The field itself. */
  disabled?: boolean;
  /** Whether there is anything to send it to yet. */
  canSend?: boolean;
}) {
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;
  const ready = hasText && canSend;

  const send = () => {
    if (!ready || disabled) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.currentTarget.blur();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    send();
  };

  return (
    <div
      data-slot="composer"
      className={cn(
        "bg-surface-secondary flex items-end gap-2 rounded-[1.4rem] py-2 pr-2 pl-5",
        // The same three states as `ui/input`, on the same tokens: the two are
        // the only places anyone types, and a field that changes character
        // between screens reads as two different products.
        "border-border border",
        "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
        "hover:border-border-strong",
        "focus-within:border-border-strong",
      )}
    >
      <textarea
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "text-foreground placeholder:text-text-tertiary field-sizing-content",
          "flex-1 resize-none bg-transparent py-1.5 text-[18px] outline-none",
          "disabled:opacity-60",
        )}
        style={{
          lineHeight: `${LINE_HEIGHT_PX}px`,
          maxHeight: `${MAX_ROWS * LINE_HEIGHT_PX + 16}px`,
        }}
      />

      <button
        type="button"
        onClick={send}
        disabled={!ready || disabled}
        data-slot="composer-send"
        data-ready={hasText ? "true" : "false"}
        className={cn(
          "text-foreground grid size-9 shrink-0 place-items-center",
          "cursor-pointer outline-none",
          "transition-[opacity,color] duration-(--duration-control) ease-(--ease-standard)",
          "hover:text-foreground focus-visible:ring-ring focus-visible:ring-2",
          "disabled:pointer-events-none",
          !ready && "opacity-40",
        )}
      >
        {hasText ? <SendArrow /> : <Waveform />}
      </button>
    </div>
  );
}

/**
 * The return key, which is also how you send. Drawn rather than typed: the
 * font subset has no glyph for it, and the one that exists in the reference is
 * a private icon font rather than an SVG.
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
      className="size-6"
    >
      <path d="M19 5.5v6a3 3 0 0 1-3 3H5.5m4.5-4.5L5.5 14.5 10 19" />
    </svg>
  );
}

/**
 * Six bars, tallest in the middle and mirrored outward, so the shape reads as
 * a voice rather than as a chart. Every bar is a rounded rect on the same
 * 4px pitch; only the height and the y differ, and both come off one number.
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
      className="size-6 overflow-visible"
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
