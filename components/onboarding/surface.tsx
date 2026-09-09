"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarkTarget } from "@/components/talkeo/mark-target";
import type { Surface as SurfaceSpec } from "@/lib/onboarding/surfaces";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * The other way to answer the question that was already asked.
 *
 * **It is not a second question.** The stage asks one thing; this is the surface
 * you can answer it on instead of saying it out loud, and both settle the same
 * stage. So it never repeats the question in its own words, and once it has been
 * answered here nothing asks again.
 *
 * Three states, and they are the same three whatever stage it belongs to:
 * `asking` is empty and the action reads as answering; `proposed` is what Talkeo
 * understood, editable, and the action is agreeing; `settled` is a record.
 *
 * Two stages have no confirm at all — there is nothing on them for the person to
 * validate, so asking for a yes would be asking for one nobody needs.
 */

/** The areas, in the order they are shown. Their labels are copy. */
const AREAS = [
  "conversation",
  "listening",
  "vocabulary",
  "pronunciation",
  "grammar",
  "reading",
  "writing",
] as const;

export type SurfaceAnswer = {
  /** The card and line this changed, empty when it is not a card edit. */
  field: string;
  value: string;
  confirms: boolean;
};

export function Surface({
  surface,
  onTouch,
  onAnswer,
}: {
  surface: SurfaceSpec;
  /** They typed in it, ticked something, moved something. */
  onTouch: () => void;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");

  if (surface.kind === "name") {
    return <NameSurface onTouch={onTouch} onAnswer={onAnswer} />;
  }
  if (surface.kind === "mode") {
    return <ModeSurface onAnswer={onAnswer} />;
  }
  if (surface.kind === "scope") {
    return (
      <ScopeSurface surface={surface} onTouch={onTouch} onAnswer={onAnswer} />
    );
  }
  return (
    <CardSurface
      surface={surface}
      title={t(`surfaces.${surface.kind}.title`)}
      onTouch={onTouch}
      onAnswer={onAnswer}
    />
  );
}

/**
 * The shell every surface sits in.
 *
 * The title is the question, in the surface's own words. It reads as a repeat
 * only while the turn that asked it is still on screen — which is why the two
 * are never up at once. Talkeo asks, finishes, and then this replaces it; by
 * then the question is gone and the surface has to carry it, or somebody who
 * looked away is answering a field with no question above it.
 */
function Frame({
  title,
  hint,
  target,
  children,
}: {
  title?: string;
  hint?: string;
  /** What a mark in the turn points at, so the voice can light this up. */
  target?: string;
  children: React.ReactNode;
}) {
  const mark = useMarkTarget(target ?? "");
  return (
    <section
      data-slot="surface"
      data-pointed={mark ? "true" : "false"}
      className={cn(
        "mx-auto flex w-full max-w-md flex-col gap-5 rounded-3xl p-6",
        "transition-[box-shadow] duration-(--duration-highlight-out) ease-(--ease-standard)",
        mark && "ring-accent-500 ring-2",
      )}
    >
      {title || hint ? (
        <div className="flex flex-col gap-1.5 text-center">
          {title ? (
            <h2 className="font-heading text-foreground text-[22px] leading-tight font-bold">
              {title}
            </h2>
          ) : null}
          {hint ? <p className="text-text-secondary text-sm">{hint}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function NameSurface({
  onTouch,
  onAnswer,
}: {
  onTouch: () => void;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");
  const [value, setValue] = useState("");
  const written = value.trim();

  return (
    <Frame title={t("name.question")} hint={t("name.hint")} target="control:name">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!written) return;
          onAnswer({ field: "", value: written, confirms: true });
        }}
      >
        <Input
          autoFocus
          value={value}
          onChange={(event) => {
            // Written as it is stored, while they type. The service raises the
            // first letter of every word and lowers nothing, so a field that
            // did not would show `martin` next to a greeting that says
            // `Martin` — the same name spelled two ways on one screen.
            setValue(writtenName(event.target.value));
            onTouch();
          }}
          placeholder={t("name.placeholder")}
          aria-label={t("name.question")}
          data-slot="surface-name"
        />
        <Button type="submit" size="lg" disabled={!written}>
          {t("name.cta")}
        </Button>
      </form>
    </Frame>
  );
}

function ModeSurface({
  onAnswer,
}: {
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <Frame title={t("mode.question")} target="control:mode">
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          data-slot="surface-mode-speak"
          onClick={() => onAnswer({ field: "", value: "speak", confirms: true })}
        >
          {t("mode.voice")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          data-slot="surface-mode-text"
          onClick={() => onAnswer({ field: "", value: "text", confirms: true })}
        >
          {t("mode.text")}
        </Button>
      </div>
    </Frame>
  );
}

function ScopeSurface({
  surface,
  onTouch,
  onAnswer,
}: {
  surface: SurfaceSpec;
  onTouch: () => void;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding.surfaces");
  // Null until they touch it, which means "whatever Talkeo marked". Derived
  // rather than copied into state: a card that keeps snapping back to what the
  // model said is a card that cannot be edited, and one that stops following it
  // before they have touched anything ignores what Talkeo just heard.
  const marked = Array.isArray(surface.body.areas)
    ? (surface.body.areas as string[])
    : [];
  const [theirs, setTheirs] = useState<string[] | null>(null);
  const picked = theirs ?? marked;

  const toggle = (area: string) => {
    onTouch();
    const on = picked.includes(area);
    playSound(on ? "deselect" : "select");
    setTheirs(on ? picked.filter((a) => a !== area) : [...picked, area]);
  };

  return (
    <Frame
      title={t("surfaces.scope.title")}
      hint={t("scope.hint")}
      target="control:scope"
    >
      <div className="flex flex-col gap-2">
        {AREAS.map((area) => {
          const on = picked.includes(area);
          return (
            <button
              key={area}
              type="button"
              role="checkbox"
              aria-checked={on}
              data-slot="surface-area"
              data-area={area}
              onClick={() => toggle(area)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left",
                "border transition-[border-color,background-color] duration-(--duration-control) ease-(--ease-standard)",
                on
                  ? "border-accent-500 bg-surface-secondary"
                  : "border-border hover:border-border-strong",
              )}
            >
              <span className="text-foreground text-[17px]">{t(`scope.${area}`)}</span>
              <Tick on={on} />
            </button>
          );
        })}
      </div>
      {surface.state !== "settled" ? (
        <Button
          size="lg"
          disabled={picked.length === 0}
          data-slot="surface-confirm"
          onClick={() =>
            onAnswer({ field: "areas", value: picked.join("\n"), confirms: true })
          }
        >
          {t("next")}
        </Button>
      ) : null}
    </Frame>
  );
}

/**
 * A card that fills up as they watch, and that they can rewrite.
 *
 * A line nobody has filled yet is a dash and not an empty box: the card is a
 * record of what was understood so far, and a blank reads as something that was
 * asked and left unanswered.
 */
function CardSurface({
  surface,
  title,
  onTouch,
  onAnswer,
}: {
  surface: SurfaceSpec;
  title: string;
  onTouch: () => void;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding.surfaces");
  const fields = FIELDS[surface.kind] ?? [];

  return (
    <Frame title={title} target={`card:${surface.card ?? ""}`}>
      <dl className="flex flex-col gap-4">
        {fields.map((field) => (
          <Line
            key={field}
            label={t(`${surface.kind}.${field}`)}
            value={asText(surface.body[field])}
            empty={t("empty")}
            readOnly={surface.state === "settled"}
            onCommit={(value) => {
              onTouch();
              onAnswer({ field, value, confirms: false });
            }}
          />
        ))}
      </dl>
      {surface.confirmable && surface.state === "proposed" ? (
        <Button
          size="lg"
          data-slot="surface-confirm"
          onClick={() => onAnswer({ field: "", value: "", confirms: true })}
        >
          {t("confirm")}
        </Button>
      ) : null}
    </Frame>
  );
}

/** Which lines each card shows, in the order it shows them. */
const FIELDS: Record<string, string[]> = {
  goal: ["goal", "work_on"],
  goals: ["goal", "work_on"],
  starting_point: ["path", "comfortable", "wants_to_work", "sees_self"],
  about_you: ["does", "follows"],
};

function Line({
  label,
  value,
  empty,
  readOnly,
  onCommit,
}: {
  label: string;
  value: string;
  empty: string;
  readOnly: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const showing = draft ?? value;

  return (
    <div className="flex flex-col gap-1">
      <dt className="text-text-tertiary text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd>
        {readOnly ? (
          <p className="text-foreground text-[17px] leading-[1.5]">
            {value || empty}
          </p>
        ) : (
          <textarea
            rows={1}
            value={showing}
            placeholder={empty}
            data-slot="surface-line"
            className={cn(
              "text-foreground placeholder:text-text-tertiary field-sizing-content",
              "w-full resize-none rounded-xl bg-transparent px-3 py-2 text-[17px] leading-[1.5]",
              "border-border border outline-none",
              "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
              "hover:border-border-strong focus:border-border-strong",
            )}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              // Committed on leaving the line rather than on every keystroke: an
              // edit travels with their next turn, and one per character would
              // be a queue of a hundred versions of the same sentence.
              if (draft !== null && draft !== value) onCommit(draft);
              setDraft(null);
            }}
          />
        )}
      </dd>
    </div>
  );
}

/**
 * A name the way the service stores it: every word's first letter raised, and
 * nothing lowered.
 *
 * Raising only, so a name that was already written right survives — `McCarthy`
 * stays `McCarthy`, which `toLowerCase` anywhere in here would not. Trailing
 * space is kept: taking it out mid-word would stop them typing a second name.
 */
function writtenName(raw: string): string {
  return raw.replace(/(^|\s)(\S)/g, (_, space: string, first: string) => space + first.toUpperCase());
}

/** A list line reads as lines; anything else reads as itself. */
function asText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("\n");
  return typeof value === "string" ? value : "";
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border",
        "transition-[background-color,border-color] duration-(--duration-control) ease-(--ease-standard)",
        on ? "border-accent-500 bg-accent-500" : "border-border",
      )}
    >
      {on ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--cta-face-text)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="m5 13 4 4L19 7" />
        </svg>
      ) : null}
    </span>
  );
}
