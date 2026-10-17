"use client";

import {
  AudioLines,
  BookA,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Dumbbell,
  Eye,
  Headphones,
  Heart,
  Keyboard,
  ListChecks,
  MessagesSquare,
  Mic,
  PenLine,
  Route,
  Smile,
  Sparkles,
  SpellCheck,
  Target,
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

/**
 * Every colour a surface uses, in one place, so the card is one palette and
 * not a fill per component.
 *
 * **Black and white only, in steps of light** (Joaquin, 17/oct: no colour on
 * the options, neither saturated nor muted). Page, card, then whatever you can
 * touch one step closer to you than the card — white on the light card,
 * lighter grey on the dark one. A tile's icon sits in a well one step the
 * other way, darker than its face, so the tile has two parts without any hue.
 *
 * **Picked is the ink colour**: the edge, the tick and the well turn to the
 * text colour, the icon to the page colour. Contrast says "this one" louder
 * than any tint did, and works the same in both themes.
 *
 * Edges are hairlines of the text colour at low opacity rather than the
 * `border` token, which in dark mode is a grey heavy enough to draw a grid.
 */
const TONE = {
  card: "bg-surface-secondary border border-black/[0.04] dark:border-white/[0.05]",
  edge: "border-black/[0.08] dark:border-white/[0.08]",
  edgeHover: "hover:border-black/[0.18] dark:hover:border-white/[0.18]",
  hairline: "border-black/[0.06] divide-black/[0.06] dark:border-white/[0.06] dark:divide-white/[0.06]",
  /** What you can touch: one step up from the card. */
  face: "bg-background dark:bg-surface-tertiary",
  /** Behind a tile's icon: one step down from its face. */
  well: "bg-black/[0.045] dark:bg-black/25",
  icon: "text-foreground/60 group-hover:text-foreground",
  picked: {
    edge: "border-foreground/85",
    well: "bg-foreground",
    icon: "text-background",
  },
  focus: "focus-visible:border-foreground/40",
} as const;

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
    return <NameSurface surface={surface} onAnswer={onAnswer} />;
  }
  if (surface.kind === "mode") {
    return <ModeSurface surface={surface} refusal={refusal} onAnswer={onAnswer} />;
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

/**
 * The shell every surface sits in: a block in the thread, under the message
 * that asked for it.
 *
 * Filled like Talkeo's own bubble, so it reads as Talkeo handing something
 * over rather than as a form dropped into the chat. What is inside it is made
 * of the product's own pieces in black and white (see `TONE`), and the action
 * is the primary button. Same type sizes as the chat.
 *
 * It sits in the conversation's own column, held to the left and as wide as
 * Talkeo's bubbles.
 */
function Frame({
  kind,
  title,
  hint,
  target,
  settled = false,
  children,
}: {
  kind: string;
  title?: string;
  hint?: string;
  /** What a mark in the turn points at, so the voice can light this up. */
  target?: string;
  /**
   * Answered and agreed. The card stays as the record of it: the hint, which
   * was about how to answer, goes, and a quiet mark beside the title says it
   * is done.
   */
  settled?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("onboarding.surfaces");
  const mark = useMarkTarget(target ?? "");
  return (
    <section
      data-slot="surface"
      data-kind={kind}
      data-settled={settled ? "true" : "false"}
      data-pointed={mark ? "true" : "false"}
      className={cn(
        TONE.card,
        "mr-auto flex w-full max-w-[56ch] flex-col gap-3 rounded-2xl p-3.5",
        "transition-[box-shadow] duration-(--duration-highlight-out) ease-(--ease-standard)",
        mark && "ring-foreground/30 ring-2",
      )}
    >
      {title || hint ? (
        <header className="flex flex-col gap-0.5 px-0.5">
          <div className="flex items-center justify-between gap-3">
            {title ? (
              <h2 className="font-heading text-foreground text-[15px] leading-snug font-semibold">
                {title}
              </h2>
            ) : null}
            {settled ? (
              <span
                data-slot="surface-settled"
                className="text-text-secondary inline-flex shrink-0 items-center gap-1 text-[12px] font-medium"
              >
                <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                {t("confirmed")}
              </span>
            ) : null}
          </div>
          {hint && !settled ? (
            <p className="text-text-secondary text-[13px] leading-snug">{hint}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * A choice, as a tile: a solid thing to press, resting on a soft shadow.
 * Picked, its edge and its icon's well turn to the ink colour.
 */
function tile(on: boolean) {
  return cn(
    "group relative flex cursor-pointer items-stretch overflow-hidden rounded-xl border text-left outline-none select-none",
    // Hover only firms up the edge. Nothing moves: a tile rising under the
    // pointer read as the list wobbling (Joaquin, 17/oct).
    "transition-[background-color,border-color] duration-(--duration-control) ease-(--ease-standard)",
    "shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-secondary)",
    // The tile's own fill is the icon's well; the body sits on top of it.
    on
      ? cn(TONE.picked.edge, TONE.picked.well)
      : cn(TONE.edge, TONE.edgeHover, TONE.well),
  );
}

/**
 * The tile's icon, in a well down its left side rather than a circle: the
 * tile reads as one piece with a place for its picture, and the label starts
 * at the same line on every tile.
 */
function TileIcon({ icon: Icon, on }: { icon: LucideIcon; on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid w-11 shrink-0 place-items-center",
        "transition-[color] duration-(--duration-control) ease-(--ease-standard)",
        on ? TONE.picked.icon : TONE.icon,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** What a tile says, on its own face over the well, rounded where it meets it. */
function TileBody({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 rounded-l-[10px] px-3.5 py-2.5",
        TONE.face,
      )}
    >
      {children}
    </span>
  );
}

/** Where a card's action goes: under what it acts on, to the right. */
function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}

function NameSurface({
  surface,
  onAnswer,
}: {
  surface: SurfaceSpec;
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");
  // What Talkeo heard, until they touch it: the field can arrive empty or
  // already filled from what they said in the chat, and the one action reads
  // as confirming in both cases. Derived and not copied, like the areas.
  const heard = typeof surface.body.name === "string" ? surface.body.name : "";
  const [theirs, setTheirs] = useState<string | null>(null);
  const value = theirs ?? heard;
  const written = value.trim();

  return (
    <Frame
      kind="name"
      title={t("name.question")}
      hint={t("name.hint")}
      target="control:name"
      settled={surface.state === "settled"}
    >
      {surface.state === "settled" ? (
        <p
          data-slot="surface-name-settled"
          className="text-foreground px-0.5 text-[15px] leading-snug"
        >
          {heard}
        </p>
      ) : (
      // The action beside the field, as one line: under it, a single button
      // took a row of its own.
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!written) return;
          onAnswer({ field: "", value: written, confirms: true });
        }}
      >
        <Input
          // No autofocus: the card comes up while they may be typing in the
          // chat field, and taking the caret from there throws their
          // sentence into the wrong box (Joaquin, 17/oct).
          className={cn(
            TONE.face,
            TONE.edge,
            TONE.edgeHover,
            // The button's height and corner, so the two read as one line.
            "h-10 min-w-0 flex-1 rounded-xl px-3.5 text-[15px]",
            TONE.focus,
          )}
          value={value}
          onChange={(event) => {
            // Written as it is stored, while they type. The service raises the
            // first letter of every word and lowers nothing, so a field that
            // did not would show `martin` next to a greeting that says
            // `Martin` — the same name spelled two ways on one screen.
            setTheirs(writtenName(event.target.value));
          }}
          placeholder={t("name.placeholder")}
          aria-label={t("name.question")}
          data-slot="surface-name"
        />
        <Button type="submit" variant="primary" size="sm" disabled={!written}>
          <Check className="size-4" strokeWidth={2.5} />
          {t("name.cta")}
        </Button>
      </form>
      )}
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
  surface,
  refusal,
  onAnswer,
}: {
  surface: SurfaceSpec;
  refusal?: MicRefusal | "";
  onAnswer: (answer: SurfaceAnswer) => void;
}) {
  const t = useTranslations("onboarding");
  const settled = surface.state === "settled";
  const chosen = surface.body.mode;
  const options = [
    { value: "speak", icon: Mic, label: t("mode.voice") },
    { value: "text", icon: Keyboard, label: t("mode.text") },
  ] as const;
  // Settled, only what they chose is left: the other one is a road not taken,
  // and still showing it reads as the question still being open.
  // Until the service echoes which one it was, both stay rather than none.
  const theirs = options.filter((option) => option.value === chosen);
  const shown = settled && theirs.length > 0 ? theirs : options;

  return (
    <Frame
      kind="mode"
      title={t("mode.question")}
      hint={t("mode.hint")}
      target="control:mode"
      settled={settled}
    >
      {/* Side by side, as the two answers to one question; stacked only where
          two would not fit a label each. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-2.5",
          shown.length > 1 && "sm:grid-cols-2",
        )}
      >
        {shown.map((option) => (
          <OptionRow
            key={option.value}
            icon={option.icon}
            label={option.label}
            picked={settled}
            slot={`surface-mode-${option.value}`}
            onClick={() =>
              onAnswer({ field: "", value: option.value, confirms: true })
            }
          />
        ))}
      </div>
      {refusal ? <MicNotice refusal={refusal} className="text-left" /> : null}
    </Frame>
  );
}

/** One of a card's choices, as a tile: what it is, and a press to pick it. */
function OptionRow({
  icon,
  label,
  picked = false,
  slot,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  /** The one they chose, once it is settled: a tick where the arrow was. */
  picked?: boolean;
  slot: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-slot={slot}
      onClick={onClick}
      className={tile(picked)}
    >
      <TileIcon icon={icon} on={picked} />
      <TileBody>
        <span className="text-foreground flex-1 text-[14px] font-medium">
          {label}
        </span>
        {picked ? (
          <Tick on />
        ) : (
          <ChevronRight aria-hidden className="text-text-tertiary size-4" />
        )}
      </TileBody>
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
      settled={surface.state === "settled"}
    >
      {/* One per row, each a picture and a box to tick, as a checklist reads.
          Two across stops the moment a label wraps. */}
      <div className="flex flex-col gap-2">
        {/* Settled, only what they picked, as with the mode. */}
        {AREAS.filter(
          (area) => surface.state !== "settled" || picked.includes(area),
        ).map((area) => {
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
              className={tile(on)}
            >
              <TileIcon icon={AREA_ICON[area]} on={on} />
              <TileBody>
                <span className="text-foreground flex-1 text-[14px] leading-tight font-medium">
                  {t(`scope.${area}`)}
                </span>
                <Tick on={on} />
              </TileBody>
            </button>
          );
        })}
      </div>
      {surface.state !== "settled" ? (
        <Footer>
          <Button
            variant="primary"
            size="sm"
            disabled={picked.length === 0}
            data-slot="surface-confirm"
            onClick={() =>
              onAnswer({ field: "areas", value: picked.join("\n"), confirms: true })
            }
          >
            {t("next")}
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
    <Frame
      kind={surface.kind}
      title={title}
      target={`card:${surface.card ?? ""}`}
      settled={surface.state === "settled"}
    >
      {surface.kind === "goals" ? (
        <GoalList surface={surface} onAnswer={onAnswer} />
      ) : (
        <dl className={PANEL}>
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
            variant="primary"
            size="sm"
            data-slot="surface-confirm"
            onClick={() => onAnswer({ field: "", value: "", confirms: true })}
          >
            <Check className="size-4" strokeWidth={2.5} />
            {t("confirm")}
          </Button>
        </Footer>
      ) : null}
    </Frame>
  );
}

/**
 * Where a card's lines sit: straight on the card, edge to edge, split by
 * hairlines. A panel inside the card was a box in a box, and the double frame
 * was most of what made it read heavy.
 */
const PANEL = cn(TONE.hairline, "-mx-3.5 flex flex-col divide-y border-t");

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
    // One group of lines per objective, each opened by its own hairline.
    <ol className="flex flex-col">
      {listed.map((goal, index) => (
        <li key={index} data-slot="surface-goal">
          <dl className={PANEL}>
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
    // One row, label beside value, the way a properties panel reads: the eye
    // runs down the labels and stops at the value it wants. Stacked, every line
    // was two lines tall and a card of four empty ones filled the screen.
    <div className="grid grid-cols-[1rem_minmax(0,9.5rem)_minmax(0,1fr)] items-start gap-x-3 px-3.5 py-2">
      <Icon
        aria-hidden
        strokeWidth={2}
        className={cn(TONE.icon, "mt-[3px] size-4")}
      />
      <dt className="text-text-secondary text-[13px] leading-[1.6]">{label}</dt>
      <dd className="min-w-0">
        {readOnly ? (
          <p
            className={cn(
              "text-[14px] leading-[1.55] whitespace-pre-line",
              value ? "text-foreground" : "text-text-tertiary",
            )}
          >
            {value || empty}
          </p>
        ) : (
          <textarea
            rows={1}
            value={showing}
            placeholder={empty}
            data-slot="surface-line"
            // `block`: inline, a textarea keeps a descender's worth of space
            // under it, which is the gap that sat under every editable line.
            className={cn(
              "text-foreground placeholder:text-text-tertiary field-sizing-content",
              "-mx-1.5 -my-0.5 block w-[calc(100%+0.75rem)] resize-none rounded-md bg-transparent px-1.5 py-0.5 text-[14px] leading-[1.55]",
              "outline-none",
              "transition-[background-color] duration-(--duration-control) ease-(--ease-standard)",
              "hover:bg-surface-tertiary focus:bg-surface-tertiary",
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

/** A checkbox the size of the text beside it, in the ink of the text. */
function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px]",
        "transition-[background-color,border-color] duration-(--duration-control) ease-(--ease-standard)",
        on
          ? "border-foreground bg-foreground text-background"
          : "border-black/25 group-hover:border-black/40 dark:border-white/25 dark:group-hover:border-white/40",
      )}
    >
      <Check
        strokeWidth={3}
        className={cn(
          "size-3 transition-[opacity,scale] duration-(--duration-control) ease-(--ease-standard)",
          on ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
    </span>
  );
}
