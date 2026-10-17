"use client";

import {
  AudioLines,
  BookA,
  BookOpen,
  Check,
  Headphones,
  Keyboard,
  MessagesSquare,
  Mic,
  PenLine,
  Plus,
  SpellCheck,
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
 * **Picked is the one green thing**: the icon turns green and the tick fills
 * with it. The grey stays grey.
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
    // The brand's green, and only here: everything else on the card is
    // neutral, so the one green thing is the one that is yours. A tint on the
    // well, not a fill — a white well shouted, a lighter grey did not read as
    // picked at all (Joaquin, 17/oct).
    // The well stays grey: any green behind the icon, tinted or solid, showed
    // as a green frame round the whole row, because the well shows on three
    // sides of the face (Joaquin, 17/oct). The icon and the tick say it.
    well: "bg-black/[0.045] dark:bg-black/25",
    icon: "text-accent-700 dark:text-accent-400",
    ring: "border-accent-500",
    dot: "bg-accent-500",
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
   * Answered and agreed. Only marked here: the card looks the same as before
   * and its action says it is done (`Confirmed`). Changing the layout on
   * confirm — the hint gone, the field gone — read as a different card.
   */
  settled?: boolean;
  children: React.ReactNode;
}) {
  const mark = useMarkTarget(target ?? "");
  return (
    <section
      data-slot="surface"
      data-kind={kind}
      data-settled={settled ? "true" : "false"}
      data-pointed={mark ? "true" : "false"}
      className={cn(
        TONE.card,
        "mr-auto flex w-full max-w-[56ch] flex-col gap-2 rounded-2xl p-2",
        "transition-[box-shadow] duration-(--duration-highlight-out) ease-(--ease-standard)",
        mark && "ring-foreground/30 ring-2",
      )}
    >
      {title || hint ? (
        <header className="flex flex-col gap-0.5 px-2 pt-1.5 pb-0.5">
          {title ? (
            <h2 className="font-heading text-foreground text-[15px] leading-snug font-semibold">
              {title}
            </h2>
          ) : null}
          {hint ? (
            <p className="text-text-secondary text-[13px] leading-snug">{hint}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * A choice, as in the reference: a grey shape with the icon at its left, and
 * the label on a face set inside it with a margin of grey round its other
 * three sides. No borders on either: the two tones are the whole drawing, and
 * a line on top of them was what made it look busy.
 *
 * Picked, the shape turns to the ink colour. Hovered, it firms up a step.
 * Nothing moves: a tile rising under the pointer read as the list wobbling
 * (Joaquin, 17/oct).
 */
function tile(on: boolean) {
  return cn(
    "group relative flex cursor-pointer items-stretch rounded-xl text-left outline-none select-none",
    "transition-[background-color] duration-(--duration-control) ease-(--ease-standard)",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-secondary)",
    on
      ? TONE.picked.well
      : cn(TONE.well, "hover:bg-black/[0.08] dark:hover:bg-black/40"),
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

/** What a tile says, on its own face inset in the tile. */
function TileBody({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        // 3px of the shape left showing above, right and below: 3px off a
        // 12px corner leaves 9px, so the two curves stay parallel. 44px in
        // all, a step over the 40px field and buttons on the same card.
        "my-[3px] mr-[3px] flex min-h-[38px] min-w-0 flex-1 items-center gap-3 rounded-[9px] py-2 pr-3 pl-3.5",
        TONE.face,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A confirm that has been pressed: the same box in the same place, saying so.
 *
 * Green, the one colour that means "yours", at a tint rather than a fill, so
 * the card's action goes quiet instead of louder once there is nothing left to
 * do. Not a button: there is nothing to press.
 */
function Confirmed() {
  const t = useTranslations("onboarding.surfaces");
  return (
    <span
      data-slot="surface-confirmed"
      className={cn(
        "font-heading inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold",
        "bg-accent-500/12 text-accent-800 dark:bg-accent-500/10 dark:text-accent-400",
      )}
    >
      <Check aria-hidden className="size-4" strokeWidth={2.5} />
      {t("confirmed")}
    </span>
  );
}

/** Where a card's action goes: under what it acts on, to the right. */
function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 pt-1">{children}</div>;
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
  const settled = surface.state === "settled";

  return (
    <Frame
      kind="name"
      title={t("name.question")}
      hint={t("name.hint")}
      target="control:name"
      settled={settled}
    >
      {/* The action beside the field, as one line: under it, a single button
          took a row of its own. */}
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
            "h-10 min-w-0 flex-1 rounded-lg px-3 text-[15px]",
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
          readOnly={settled}
        />
        {settled ? (
          <Confirmed />
        ) : (
          <Button type="submit" variant="primary" size="sm" className="rounded-lg" disabled={!written}>
            <Check className="size-4" strokeWidth={2.5} />
            {t("name.cta")}
          </Button>
        )}
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
  // Settled, both stay where they were and the chosen one says so, the same
  // way a confirm turns into `Confirmed`: the card does not rearrange itself.
  const shown = options;

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
          "grid grid-cols-1 gap-1.5",
          shown.length > 1 && "sm:grid-cols-2",
        )}
      >
        {shown.map((option) => (
          <ModeChoice
            key={option.value}
            icon={option.icon}
            label={option.label}
            picked={settled && option.value === chosen}
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

/**
 * One of the two ways to answer, as a plain button with its icon.
 *
 * Not a list tile: this is a fork with two roads, pressed once, and the tile
 * — a picture well and a face — is for lists you go down and tick
 * (Joaquin, 17/oct). Same height and corner as the card's other buttons.
 */
function ModeChoice({
  icon: Icon,
  label,
  picked = false,
  slot,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  /** The one they chose, once it is settled: a tick after the label. */
  picked?: boolean;
  slot: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-slot={slot}
      onClick={onClick}
      className={cn(
        "group flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 outline-none select-none",
        "text-[14px] font-medium",
        "transition-[border-color,background-color,color] duration-(--duration-control) ease-(--ease-standard)",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-secondary)",
        // Chosen, it takes the same green tint as `Confirmed`, with the tick
        // in place of its icon; nothing else on the card changes.
        picked
          ? "border-transparent bg-accent-500/12 text-accent-800 dark:bg-accent-500/10 dark:text-accent-400"
          : cn("text-foreground", TONE.face, TONE.edge, TONE.edgeHover),
      )}
    >
      {picked ? (
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      ) : (
        <Icon
          aria-hidden
          strokeWidth={1.75}
          className={cn("size-4", TONE.icon)}
        />
      )}
      {label}
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
      <div className="flex flex-col gap-1.5">
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
              className={tile(on)}
            >
              <TileIcon icon={AREA_ICON[area]} on={on} />
              <TileBody>
                <span className="text-foreground flex-1 text-[14px] leading-snug">
                  {t(`scope.${area}`)}
                </span>
                <Tick on={on} />
              </TileBody>
            </button>
          );
        })}
      </div>
      <Footer>
        {surface.state === "settled" ? (
          <Confirmed />
        ) : (
          <Button
            variant="primary"
            size="sm" className="rounded-lg"
            disabled={picked.length === 0}
            data-slot="surface-confirm"
            onClick={() =>
              onAnswer({ field: "areas", value: picked.join("\n"), confirms: true })
            }
          >
            {t("next")}
          </Button>
        )}
      </Footer>
    </Frame>
  );
}

/**
 * A card that fills up as they watch, and that they can rewrite.
 *
 * A line nobody has filled yet shows an example answer, in the faint colour of
 * a placeholder: a blank read as asked and left unanswered, and a dash read as
 * broken (Joaquin, 17/oct).
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
            <CardLine
              key={field}
              field={field}
              label={t(`${surface.kind}.${field}`)}
              value={surface.body[field]}
              example={t(`example.${field}`)}
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
            size="sm" className="rounded-lg"
            data-slot="surface-confirm"
            onClick={() => onAnswer({ field: "", value: "", confirms: true })}
          >
            <Check className="size-4" strokeWidth={2.5} />
            {t("confirm")}
          </Button>
        </Footer>
      ) : null}
      {surface.confirmable && surface.state === "settled" ? (
        <Footer>
          <Confirmed />
        </Footer>
      ) : null}
    </Frame>
  );
}

/** Where a card's lines sit: one under the other, a field each. */
const PANEL = "flex flex-col gap-3 pt-1";

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
    // One group of fields per objective, further apart than the fields in one.
    <ol className="flex flex-col gap-5">
      {listed.map((goal, index) => (
        <li key={index} data-slot="surface-goal">
          <dl className={PANEL}>
            {FIELDS.goal.map((field) => (
              <CardLine
                key={field}
                field={field}
                label={t(`goal.${field}`)}
                value={goal[field]}
                example={t(`example.${field}`)}
                readOnly={
                  surface.state === "settled" || index > 0 || goals.length === 0
                }
                onCommit={(value) => {
                  onAnswer({ field, value, confirms: false });
                }}
              />
            ))}
            {/* What surrounds it, when Talkeo noted any. Read only: the
                service takes no edit for it, it is added by saying so. */}
            {asPoints(goal.context).length > 0 ? (
              <Points
                label={t("goal.context")}
                value={asPoints(goal.context)}
                example=""
                readOnly
                onCommit={() => {}}
              />
            ) : null}
          </dl>
        </li>
      ))}
    </ol>
  );
}

/**
 * One line of a card: what it is, and what Talkeo understood, in a field.
 *
 * Built like the name card's field — label above, the value in the same box —
 * so every card in the onboarding is made of the same two pieces. A line
 * nobody has filled yet shows an example of an answer rather than a dash: a
 * dash read as something broken, an example says what goes there.
 */
function Line({
  label,
  value,
  example,
  readOnly,
  onCommit,
}: {
  label: string;
  value: string;
  example: string;
  readOnly: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const showing = draft ?? value;
  const box = cn(
    "block w-full rounded-lg border px-3 py-2 text-[14px] leading-[1.5]",
    TONE.face,
    TONE.edge,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-text-secondary px-2 text-[13px] leading-snug font-medium">
        {label}
      </dt>
      <dd className="min-w-0">
        {readOnly ? (
          <p
            className={cn(
              box,
              "whitespace-pre-line",
              value ? "text-foreground" : "text-text-tertiary",
            )}
          >
            {value || example}
          </p>
        ) : (
          <textarea
            rows={1}
            value={showing}
            placeholder={example}
            data-slot="surface-line"
            className={cn(
              box,
              "text-foreground placeholder:text-text-tertiary field-sizing-content resize-none outline-none",
              "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
              TONE.edgeHover,
              TONE.focus,
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

/** One line of a card, drawn as points or as a sentence by what the Core keeps. */
function CardLine({
  field,
  value,
  ...line
}: {
  field: string;
  label: string;
  value: unknown;
  example: string;
  readOnly: boolean;
  onCommit: (value: string) => void;
}) {
  return LIST_FIELDS.has(field) ? (
    <Points {...line} value={asPoints(value)} />
  ) : (
    <Line {...line} value={asText(value)} />
  );
}

/**
 * The lines the service keeps as a list, one point each.
 *
 * `work_on`, `path`, `does`, `follows` and a goal's `context` are arrays in the
 * Core ("one line each", `stage_tools.py`), and its edits take them back as
 * one string with a line per point (`cards.apply_edit`). Drawn as one block of
 * text they read as a paragraph; drawn as points they read as what they are.
 */
const LIST_FIELDS: ReadonlySet<string> = new Set([
  "work_on",
  "path",
  "does",
  "follows",
  "context",
]);

function asPoints(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return typeof value === "string" ? value.split("\n").filter(Boolean) : [];
}

/**
 * A list line: the label, and its points in one field, each on its own row
 * behind a dot. Editable, each point is its own input, Enter starts the next
 * one and `Add` opens one at the end; the list goes back to the service when
 * the caret leaves the field, all at once, like the single lines do.
 */
function Points({
  label,
  value,
  example,
  readOnly,
  onCommit,
}: {
  label: string;
  value: string[];
  example: string;
  readOnly: boolean;
  onCommit: (value: string) => void;
}) {
  const t = useTranslations("onboarding.surfaces");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [opened, setOpened] = useState(-1);
  const points = draft ?? value;
  const shown = !readOnly && points.length === 0 ? [""] : points;

  const change = (index: number, text: string) => {
    const next = [...shown];
    next[index] = text;
    setDraft(next);
  };
  const open = (at: number) => {
    const next = [...shown];
    next.splice(at, 0, "");
    setDraft(next);
    setOpened(at);
  };
  const commit = () => {
    if (draft === null) return;
    const kept = draft.map((point) => point.trim()).filter(Boolean);
    if (kept.join("\n") !== value.join("\n")) onCommit(kept.join("\n"));
    setDraft(null);
    setOpened(-1);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-text-secondary px-2 text-[13px] leading-snug font-medium">
        {label}
      </dt>
      <dd
        className={cn(
          "flex min-w-0 flex-col rounded-lg border px-3 py-1.5",
          TONE.face,
          TONE.edge,
          !readOnly && cn(TONE.edgeHover, "focus-within:border-foreground/40"),
          "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
        )}
        onBlur={(event) => {
          // Only when the caret leaves the whole field, not on moving between
          // its points.
          if (!event.currentTarget.contains(event.relatedTarget as Node)) commit();
        }}
      >
        {readOnly && points.length === 0 ? (
          <p className="text-text-tertiary py-0.5 text-[14px] leading-[1.5]">{example}</p>
        ) : (
          <ul className="flex flex-col">
            {shown.map((point, index) => (
              <li key={index} className="flex items-start gap-2.5 py-0.5">
                <span
                  aria-hidden
                  className="bg-text-tertiary mt-[9px] size-1 shrink-0 rounded-full"
                />
                {readOnly ? (
                  <p className="text-foreground text-[14px] leading-[1.5]">{point}</p>
                ) : (
                  <input
                    value={point}
                    // Only the one they just opened: never on the card coming up.
                    autoFocus={index === opened}
                    placeholder={index === 0 ? example : ""}
                    data-slot="surface-point"
                    aria-label={label}
                    className="text-foreground placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent text-[14px] leading-[1.5] outline-none"
                    onChange={(event) => change(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      if (point.trim()) open(index + 1);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && shown.some((point) => point.trim()) ? (
          <button
            type="button"
            onClick={() => open(shown.length)}
            data-slot="surface-point-add"
            className="text-text-secondary hover:text-foreground -ml-0.5 flex w-fit cursor-pointer items-center gap-1.5 py-1 text-[13px] font-medium outline-none"
          >
            <Plus aria-hidden className="size-3.5" strokeWidth={2.25} />
            {t("add")}
          </button>
        ) : null}
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
        // Two circles, no check (Joaquin, 17/oct): a ring, and picked, a dot
        // inside it with a gap all round, so the ring still reads.
        "grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]",
        "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
        on
          ? TONE.picked.ring
          : "border-black/25 group-hover:border-black/40 dark:border-white/25 dark:group-hover:border-white/40",
      )}
    >
      <span
        className={cn(
          "size-2.5 rounded-full",
          TONE.picked.dot,
          "transition-[opacity,scale] duration-(--duration-control) ease-(--ease-standard)",
          on ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
    </span>
  );
}
