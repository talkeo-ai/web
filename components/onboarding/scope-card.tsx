"use client";

import { BookA, Blocks, Check, Ear, Keyboard, Mic, Speech } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * What they want to get better at, offered instead of only asked.
 *
 * Typing an answer to a question with a known set of answers is work the screen
 * can do for you, and the assistant says as much out loud — mark one or
 * several, or just tell me. Both stay open: this does the composer's job here,
 * it does not take it away, and saying it in words goes to the same place.
 *
 * ⚠ It is on screen because the turn asked for it, not because a step is on.
 * The turn names the control it is offering and this answers to that name, the
 * same rule as every other mark. Nothing here knows which stage the run is in.
 */
export const SCOPE_CONTROL = "control:scope";

const OPTIONS = [
  {
    id: "conversation",
    label: "Conversación",
    hint: "Sostener una charla con soltura",
    Icon: Speech,
  },
  {
    id: "listening",
    label: "Comprensión oral",
    hint: "Seguir el ritmo de un nativo",
    Icon: Ear,
  },
  {
    id: "vocabulary",
    label: "Vocabulario",
    hint: "Tener la palabra justa a mano",
    Icon: BookA,
  },
  {
    id: "pronunciation",
    label: "Pronunciación",
    hint: "Sonar claro y natural al hablar",
    Icon: Mic,
  },
  {
    id: "grammar",
    label: "Gramática",
    hint: "Construir frases correctamente",
    Icon: Blocks,
  },
  {
    id: "writing",
    label: "Escritura",
    hint: "Escribir con el tono de cada situación",
    Icon: Keyboard,
  },
];

/** Long enough to see the row settle before the screen moves on. */
const LEAVE_MS = 280;

export function ScopeCard({
  onAnswered,
}: {
  /** The chosen areas, in the words that were on the rows. */
  onAnswered: (said: string) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  /** Which edges have something past them. A fade over nothing is dirt. */
  const [past, setPast] = useState({ top: false, bottom: false });
  const box = useRef<HTMLDivElement>(null);

  const readEdges = (node: HTMLDivElement) =>
    setPast({
      top: node.scrollTop > 1,
      // One pixel of slack: a scroll box that has been taken to the end can be
      // a fraction short of it, and a fade that never quite goes is worse than
      // no fade.
      bottom: node.scrollTop + node.clientHeight < node.scrollHeight - 1,
    });

  // ⚠ Measured, never assumed. Scrolling is the only thing that would tell us
  // otherwise, and a list that fits never scrolls — so a fade that starts on
  // sits over an end nobody can reach, for good. The observer fires once when
  // it starts watching, which covers the first measurement too.
  useEffect(() => {
    const node = box.current;
    if (!node) return;

    const observer = new ResizeObserver(() => readEdges(node));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const toggle = (id: string) =>
    setChosen((previous) =>
      previous.includes(id)
        ? previous.filter((one) => one !== id)
        : [...previous, id],
    );

  const send = () => {
    const said = OPTIONS.filter((option) => chosen.includes(option.id))
      .map((option) => option.label)
      .join(", ");

    setLeaving(true);
    setTimeout(() => onAnswered(said), LEAVE_MS);
  };

  return (
    <div
      className={cn(
        // Centred as a block, and only as tall as it needs. The list scrolls
        // when it has to, and the button stays with it instead of being pinned
        // to a bottom edge it has nothing to do with.
        "mx-auto flex h-full w-full max-w-md flex-col justify-center px-6 py-4",
        "transition-opacity ease-linear",
        leaving && "pointer-events-none opacity-0",
      )}
      style={{ transitionDuration: `${LEAVE_MS}ms` }}
    >
      {/* No heading, and no "select all".
          Talkeo just asked — two headings for one decision is the same question
          in two voices. And a shortcut for six rows is a control that earns its
          space only on a list nobody would tick by hand. */}

      {/* Scrolls inside its own box, so growing it never pushes the button off
          the bottom. The list runs past both ends rather than stopping at them
          — a row cut in half by a hard edge reads as a rendering fault, and
          the fades let it go instead.

          The top one only shows once something has gone under it: with the
          list at rest there is nothing to fade, and a band of solid colour
          over the first row reads as dirt. */}
      <div className="relative min-h-0">
        <div
          ref={box}
          onScroll={(event) => readEdges(event.currentTarget)}
          // The negative margin gives the scrollbar its own gutter instead of
          // laying it over the rows.
          className="scroll-quiet -mr-3 flex max-h-full flex-col gap-1.5 overflow-y-auto py-1 pr-3"
        >
          {OPTIONS.map((option) => {
            const picked = chosen.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={picked}
                onClick={() => toggle(option.id)}
                className={cn(
                  "flex w-full shrink-0 cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3.5 text-left",
                  "transition-colors duration-(--duration-control) ease-(--ease-standard)",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2",
                  // One fill, one step. No borders anywhere: six fills divided
                  // by six hairlines is a table, and the fill already says
                  // where a row ends. Chosen is one step up the same ramp —
                  // the check is what you read, the fill only backs it.
                  picked
                    ? "bg-surface-tertiary"
                    : "bg-surface-secondary hover:bg-surface-tertiary/60",
                )}
              >
                {/* No chip around it. A box behind every icon is six more
                    rectangles on a screen that already has six. */}
                <option.Icon
                  className={cn(
                    "size-[18px] shrink-0",
                    "transition-colors duration-(--duration-control) ease-(--ease-standard)",
                    picked ? "text-foreground" : "text-text-secondary",
                  )}
                  aria-hidden
                />

                <span className="flex-1">
                  <span className="text-foreground block text-[15px] font-medium">
                    {option.label}
                  </span>
                  <span className="text-text-secondary block text-[13px]">
                    {option.hint}
                  </span>
                </span>

                {/* A check, not a dot: more than one of these can be true, and
                    a radio says the opposite. */}
                <span
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-full border",
                    "transition-colors duration-(--duration-control) ease-(--ease-standard)",
                    picked
                      ? "border-foreground bg-foreground text-background"
                      : "border-border",
                  )}
                >
                  <Check
                    className={cn(
                      "size-2.5 stroke-[3.5]",
                      "transition-transform duration-(--duration-control) ease-(--ease-standard)",
                      picked ? "scale-100" : "scale-0",
                    )}
                    aria-hidden
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-hidden
          className="fade-edge-top pointer-events-none absolute inset-x-0 top-0 h-4 transition-opacity duration-(--duration-control) ease-(--ease-standard)"
          style={{ opacity: past.top ? 1 : 0 }}
        />
        <div
          aria-hidden
          className="fade-edge-bottom pointer-events-none absolute inset-x-0 bottom-0 h-4 transition-opacity duration-(--duration-control) ease-(--ease-standard)"
          style={{ opacity: past.bottom ? 1 : 0 }}
        />
      </div>

      <div className="pt-4">
        <Button
          type="button"
          size="md"
          className="w-full"
          disabled={chosen.length === 0}
          onClick={send}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
