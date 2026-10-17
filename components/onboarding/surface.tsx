"use client";

import {
  ArrowRight,
  AudioLines,
  BookA,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Compass,
  Dumbbell,
  Eye,
  Flag,
  Headphones,
  Heart,
  Keyboard,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  Mic,
  PenLine,
  Route,
  Smile,
  Sparkles,
  SpellCheck,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarkTarget } from "@/components/talkeo/mark-target";
import type { MicRefusal } from "@/lib/audio/microphone";
import type { Surface as SurfaceSpec } from "@/lib/onboarding/surfaces";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

import { MicNotice } from "./mic-notice";

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

const AREA_ICON: Record<(typeof AREAS)[number], LucideIcon> = {
  conversation: MessagesSquare,
  listening: Headphones,
  vocabulary: BookA,
  pronunciation: AudioLines,
  grammar: SpellCheck,
  reading: BookOpen,
  writing: PenLine,
};

/** The mark beside each line of a card, so a line is found before it is read. */
const FIELD_ICON: Record<string, LucideIcon> = {
  goal: Target,
  work_on: ListChecks,
  path: Route,
  comfortable: Smile,
  wants_to_work: Dumbbell,
  sees_self: Eye,
  does: Briefcase,
  follows: Heart,
};

export type SurfaceAnswer = {
  /** The card and line this changed, empty when it is not a card edit. */
  field: string;
  value: string;
  confirms: boolean;
};

export function Surface({
  surface,
  refusal,
  onAnswer,
}: {
  surface: SurfaceSpec;
  /** Why the microphone did not open, for the surface that offers it. */
  refusal?: MicRefusal | "";
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");

  if (surface.kind === "name") {
    return <NameSurface onAnswer={onAnswer} />;
  }
  if (surface.kind === "mode") {
    return <ModeSurface refusal={refusal} onAnswer={onAnswer} />;
  }
  if (surface.kind === "scope") {
    return <ScopeSurface surface={surface} onAnswer={onAnswer} />;
  }
  return (
    <CardSurface
      surface={surface}
      title={t(`surfaces.${surface.kind}.title`)}
      onAnswer={onAnswer}
    />
  );
}

/** The mark at the head of each card: what it is about, before it is read. */
const CARD_ICON: Record<string, LucideIcon> = {
  name: UserRound,
  mode: MessageCircle,
  scope: LayoutGrid,
  goal: Target,
  goals: Flag,
  starting_point: Compass,
  about_you: Sparkles,
};

/**
 * The shell every surface sits in: a block in the thread, under the message
 * that asked for it.
 *
 * It sits in the conversation's own column, held to the left and as wide as
 * Talkeo's bubbles, so it reads as part of what Talkeo said rather than as a
 * form laid over the chat. The title is a label in the card's header, at
 * reading size: the question is already in the message right above, and a
 * heading would say it a second time, louder.
 */
function Frame({
  kind,
  title,
  hint,
  target,
  children,
}: {
  kind: string;
  title?: string;
  hint?: string;
  /** What a mark in the turn points at, so the voice can light this up. */
  target?: string;
  children: React.ReactNode;
}) {
  const mark = useMarkTarget(target ?? "");
  const Icon = CARD_ICON[kind] ?? Sparkles;
  return (
    <section
      data-slot="surface"
      data-kind={kind}
      data-pointed={mark ? "true" : "false"}
      className={cn(
        "bg-background mr-auto w-full max-w-[56ch] overflow-hidden rounded-2xl border",
        "transition-[box-shadow,border-color] duration-(--duration-highlight-out) ease-(--ease-standard)",
        mark ? "border-accent-500 ring-accent-500/20 ring-4" : "border-border",
      )}
    >
      {title || hint ? (
        <header className="flex items-start gap-3 px-4 pt-4 pb-3.5">
          <IconTile icon={Icon} />
          <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
            {title ? (
              <h2 className="text-foreground text-[15px] leading-snug font-semibold">
                {title}
              </h2>
            ) : null}
            {hint ? (
              <p className="text-text-secondary text-[13px] leading-snug">{hint}</p>
            ) : null}
          </div>
        </header>
      ) : null}
      <div className="border-border border-t">{children}</div>
    </section>
  );
}

/** A small square that holds an icon, the same everywhere a card shows one. */
function IconTile({
  icon: Icon,
  tone = "quiet",
}: {
  icon: LucideIcon;
  tone?: "quiet" | "on";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg",
        "transition-[background-color,color] duration-(--duration-control) ease-(--ease-standard)",
        tone === "on"
          ? "bg-accent-500 text-(--cta-face-text)"
          : "bg-surface-secondary text-text-secondary",
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

/** Where a card's action goes: under its rows, to the right, like a reply box. */
function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border flex items-center justify-end gap-2 border-t px-4 py-3">
      {children}
    </div>
  );
}

function NameSurface({
  onAnswer,
}: {
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");
  const [value, setValue] = useState("");
  const written = value.trim();

  return (
    <Frame
      kind="name"
      title={t("name.question")}
      hint={t("name.hint")}
      target="control:name"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!written) return;
          onAnswer({ field: "", value: written, confirms: true });
        }}
      >
        <div className="px-4 py-4">
          <Input
            autoFocus
            value={value}
            onChange={(event) => {
              // Written as it is stored, while they type. The service raises the
              // first letter of every word and lowers nothing, so a field that
              // did not would show `martin` next to a greeting that says
              // `Martin` — the same name spelled two ways on one screen.
              setValue(writtenName(event.target.value));
            }}
            placeholder={t("name.placeholder")}
            aria-label={t("name.question")}
            data-slot="surface-name"
          />
        </div>
        <Footer>
          <Button type="submit" size="sm" disabled={!written}>
            {t("name.cta")}
            <ArrowRight className="size-4" />
          </Button>
        </Footer>
      </form>
    </Frame>
  );
}

/**
 * Speak or write.
 *
 * ⚠ Pressing "speak" asks for the microphone and settles NOTHING until it
 * opens. Both options stay on screen through a failure, with the reason under
 * them: the only way into writing is pressing the other button. It used to
 * declare `speak` on the press and then discover the microphone had refused,
 * which left somebody in a view with no input and no explanation.
 */
function ModeSurface({
  refusal,
  onAnswer,
}: {
  refusal?: MicRefusal | "";
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <Frame
      kind="mode"
      title={t("mode.question")}
      hint={t("mode.hint")}
      target="control:mode"
    >
      <div className="divide-border flex flex-col divide-y">
        <OptionRow
          icon={Mic}
          label={t("mode.voice")}
          slot="surface-mode-speak"
          onClick={() => onAnswer({ field: "", value: "speak", confirms: true })}
        />
        <OptionRow
          icon={Keyboard}
          label={t("mode.text")}
          slot="surface-mode-text"
          onClick={() => onAnswer({ field: "", value: "text", confirms: true })}
        />
      </div>
      {refusal ? (
        <div className="border-border border-t px-4 py-3">
          <MicNotice refusal={refusal} />
        </div>
      ) : null}
    </Frame>
  );
}

/** One of a card's choices, as a row: what it is, and a press to pick it. */
function OptionRow({
  icon,
  label,
  slot,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  slot: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-slot={slot}
      onClick={onClick}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none",
        "transition-[background-color] duration-(--duration-control) ease-(--ease-standard)",
        "hover:bg-surface-secondary focus-visible:bg-surface-secondary",
      )}
    >
      <IconTile icon={icon} />
      <span className="text-foreground flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight
        aria-hidden
        className={cn(
          "text-text-tertiary size-4",
          "transition-transform duration-(--duration-control) ease-(--ease-standard)",
          "group-hover:translate-x-0.5",
        )}
      />
    </button>
  );
}

function ScopeSurface({
  surface,
  onAnswer,
}: {
  surface: SurfaceSpec;
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
    const on = picked.includes(area);
    playSound(on ? "deselect" : "select");
    setTheirs(on ? picked.filter((a) => a !== area) : [...picked, area]);
  };

  return (
    <Frame
      kind="scope"
      title={t("scope.title")}
      hint={t("scope.hint")}
      target="control:scope"
    >
      <div className="divide-border flex flex-col divide-y">
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
                "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left outline-none",
                "transition-[background-color] duration-(--duration-control) ease-(--ease-standard)",
                "hover:bg-surface-secondary focus-visible:bg-surface-secondary",
              )}
            >
              <IconTile icon={AREA_ICON[area]} tone={on ? "on" : "quiet"} />
              <span className="text-foreground flex-1 text-[15px]">
                {t(`scope.${area}`)}
              </span>
              <Tick on={on} />
            </button>
          );
        })}
      </div>
      {surface.state !== "settled" ? (
        <Footer>
          <Button
            size="sm"
            disabled={picked.length === 0}
            data-slot="surface-confirm"
            onClick={() =>
              onAnswer({ field: "areas", value: picked.join("\n"), confirms: true })
            }
          >
            {t("next")}
            <ArrowRight className="size-4" />
          </Button>
        </Footer>
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
  onAnswer,
}: {
  surface: SurfaceSpec;
  title: string;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding.surfaces");
  const fields = FIELDS[surface.kind] ?? [];

  return (
    <Frame kind={surface.kind} title={title} target={`card:${surface.card ?? ""}`}>
      {surface.kind === "goals" ? (
        <GoalList surface={surface} onAnswer={onAnswer} />
      ) : (
        <dl className="divide-border flex flex-col divide-y">
          {fields.map((field) => (
            <Line
              key={field}
              icon={FIELD_ICON[field]}
              label={t(`${surface.kind}.${field}`)}
              value={asText(surface.body[field])}
              empty={t("empty")}
              readOnly={surface.state === "settled"}
              onCommit={(value) => {
                onAnswer({ field, value, confirms: false });
              }}
            />
          ))}
        </dl>
      )}
      {surface.confirmable && surface.state === "proposed" ? (
        <Footer>
          <Button
            size="sm"
            data-slot="surface-confirm"
            onClick={() => onAnswer({ field: "", value: "", confirms: true })}
          >
            <Check className="size-4" />
            {t("confirm")}
          </Button>
        </Footer>
      ) : null}
    </Frame>
  );
}

/** Which lines each card shows, in the order it shows them. */
const FIELDS: Record<string, string[]> = {
  goal: ["goal", "work_on"],
  starting_point: ["path", "comfortable", "wants_to_work", "sees_self"],
  about_you: ["does", "follows"],
};

/**
 * The objectives: the one card that is a list of things rather than a set of
 * fields. The service sends `{ goals: [{ goal, work_on }, …] }`.
 *
 * ⚠ It used to be read as the single-goal card, `body.goal` and `body.work_on`,
 * which this body does not have — so it showed two empty lines labelled with raw
 * keys, because `goals` has no labels of its own. Each objective reads with the
 * first goal's labels.
 *
 * Only the first is editable: an edit on this card names a field and not an
 * objective, and the service applies it to the first one (`cards.apply_edit`).
 * The rest are corrected by saying so.
 */
function GoalList({
  surface,
  onAnswer,
}: {
  surface: SurfaceSpec;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding.surfaces");
  const goals = Array.isArray(surface.body.goals)
    ? (surface.body.goals as Record<string, unknown>[])
    : [];
  const listed = goals.length > 0 ? goals : [{}];

  return (
    <ol className="divide-border flex flex-col divide-y">
      {listed.map((goal, index) => (
        <li key={index} data-slot="surface-goal">
          <dl className="flex flex-col">
            {FIELDS.goal.map((field) => (
              <Line
                key={field}
                icon={FIELD_ICON[field]}
                label={t(`goal.${field}`)}
                value={asText(goal[field])}
                empty={t("empty")}
                readOnly={
                  surface.state === "settled" || index > 0 || goals.length === 0
                }
                onCommit={(value) => {
                  onAnswer({ field, value, confirms: false });
                }}
              />
            ))}
          </dl>
        </li>
      ))}
    </ol>
  );
}

/**
 * One line of a card: an icon, what the line is, and what Talkeo understood.
 *
 * The value reads as text and becomes a field only where the pointer or the
 * caret is. A box around every line made the card a form to fill in; it is a
 * record of what was heard, that can be corrected.
 */
function Line({
  icon: Icon = Sparkles,
  label,
  value,
  empty,
  readOnly,
  onCommit,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  empty: string;
  readOnly: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const showing = draft ?? value;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon
        aria-hidden
        strokeWidth={1.75}
        className="text-text-tertiary mt-[3px] size-4 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <dt className="text-text-secondary text-[13px] leading-snug">{label}</dt>
        <dd>
          {readOnly ? (
            <p className="text-foreground text-[15px] leading-[1.6] whitespace-pre-line">
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
                "-mx-2 w-[calc(100%+1rem)] resize-none rounded-lg bg-transparent px-2 py-1 text-[15px] leading-[1.6]",
                "outline-none",
                "transition-[background-color] duration-(--duration-control) ease-(--ease-standard)",
                "hover:bg-surface-secondary focus:bg-surface-secondary",
              )}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                // Committed on leaving the line rather than on every keystroke:
                // an edit travels with their next turn, and one per character
                // would be a queue of a hundred versions of the same sentence.
                if (draft !== null && draft !== value) onCommit(draft);
                setDraft(null);
              }}
            />
          )}
        </dd>
      </div>
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
