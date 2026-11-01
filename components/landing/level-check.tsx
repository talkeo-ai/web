"use client";

import { ArrowLeftRight, Check, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EnterOnboarding } from "@/components/onboarding/enter-onboarding";
import { Button } from "@/components/ui/button";
import { useCardDrag, type Side } from "@/lib/swipe/use-card-drag";
import { BANDS, estimate, type LevelCard } from "@/lib/try/level-check";
import { cn } from "@/lib/utils";

/** Degrees per pixel of drag. The card hinges from below, so a little goes far. */
const TILT = 1 / 22;
/** How far an answered card flies, and how far it tips on the way. */
// A throw that glides out (Joaquin, 1/nov): 600px solid read as wandering
// off, 300px with a late fade read as stopping and vanishing. The answer is
// the curve, not the distance: fast off the hand, then a long deceleration
// while it fades and softens, so it is gone as it slows instead of after.
const EXIT_PX = 440;
const EXIT_DEG = 18;
const OUT_MS = 560;
const OUT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Short enough that a fast swiper is never reading a word still in focus. */
const IN_MS = 360;
/**
 * The card waiting underneath: narrower and showing a strip below the top
 * one, blank. Scaled from its bottom edge so the strip is the same at any
 * card size.
 */
const BEHIND = { scale: 0.92, y: 8 };
/** Card and deck share one hinge, so a flying ghost tips the way the card did. */
const HINGE = "50% 115%";

/**
 * The card's surface. The proportions are the reference's (Joaquin, 1/nov),
 * measured off the recording: corners about 6% of the width, a hairline edge,
 * and a shadow that is mostly spread with very little darkness.
 */
const SURFACE = cn(
  "bg-background rounded-[20px] border",
  "border-black/[0.05] dark:border-white/[0.08]",
  "shadow-[0_1px_3px_rgb(0_0_0/0.04),0_14px_36px_-10px_rgb(0_0_0/0.12)]",
  "dark:shadow-[0_1px_3px_rgb(0_0_0/0.3),0_14px_36px_-10px_rgb(0_0_0/0.55)]",
);

type Flying = { key: string; card: LevelCard; side: Side; fromX: number };

/**
 * The landing's demonstration: a rough level from eight words, played as a
 * deck of tall cards you swipe — right if you know the word, left if you
 * don't, or the two buttons under it, or the arrow keys. Two of the words are
 * invented, which is how the yes/no method keeps "yes to everything" from
 * scoring C2 (see `lib/try/level-check.ts`).
 *
 * Look and motion follow a reference Joaquin sent (1/nov): no frame around
 * the deck, a header over it rather than a count on the card, one blank card
 * underneath, the top card hinging from below as it is dragged, and the next
 * one rising out of the blank and coming into focus rather than sliding in.
 * Leaving is drawn by the deck, not by the card, so the card can unmount
 * while its ghost is still flying.
 *
 * It is self-contained on purpose: the plan is for the hero to clear away
 * once someone starts playing, leaving this centred as the onboarding's first
 * step (Joaquin, 1/nov, not built yet).
 */
export function LevelCheck({ className }: { className?: string }) {
  const t = useTranslations("levelCheck");
  const cards = t.raw("cards") as LevelCard[];

  const [knows, setKnows] = useState<boolean[]>([]);
  const [flying, setFlying] = useState<Flying[]>([]);
  /** Bumped on "again", so the first card replays its entrance. */
  const [round, setRound] = useState(0);
  const index = knows.length;
  const finished = index >= cards.length;
  const total = cards.length;

  const answer = (side: Side, fromX: number) => {
    if (finished) return;
    setFlying((f) => [...f, { key: `${round}-${index}`, card: cards[index], side, fromX }]);
    setKnows((k) => [...k, side === "right"]);
  };

  const again = () => {
    setKnows([]);
    setFlying([]);
    setRound((r) => r + 1);
  };

  return (
    <section
      aria-label={t("title")}
      // Arrow keys answer while focus is anywhere in here, so a keyboard plays
      // it as fast as a thumb.
      onKeyDown={(event) => {
        if (finished) return;
        if (event.key === "ArrowLeft") answer("left", 0);
        else if (event.key === "ArrowRight") answer("right", 0);
        else return;
        event.preventDefault();
      }}
      className={cn("flex w-full flex-col items-center", className)}
    >
      {/* The deck: one size for every state, so finishing does not move the
          page. Width steps with the breakpoint and the height follows it. No
          header over it (Joaquin, 1/nov): a title competed with the hero's,
          and where you are reads from the row underneath. */}
      <div className="relative isolate aspect-[4/5] w-[284px] sm:w-[300px] lg:w-[320px]">
        {finished ? (
          <Result key={round} cards={cards} knows={knows} />
        ) : (
          <>
            {index < total - 1 && (
              <div
                aria-hidden
                className={cn(SURFACE, "absolute inset-0 -z-10")}
                style={{
                  transform: `translateY(${BEHIND.y}px) scale(${BEHIND.scale})`,
                  transformOrigin: "50% 100%",
                }}
              />
            )}
            <Card key={`${round}-${index}`} card={cards[index]} onAnswer={answer} />
          </>
        )}

        {flying.map((f) => (
          <div
            key={f.key}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20"
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              setFlying((all) => all.filter((x) => x.key !== f.key));
            }}
            style={
              {
                transformOrigin: HINGE,
                "--card-from-x": `${f.fromX}px`,
                "--card-from-rotate": `${f.fromX * TILT}deg`,
                "--card-to-x": `${f.side === "left" ? -EXIT_PX : EXIT_PX}px`,
                "--card-to-rotate": `${f.side === "left" ? -EXIT_DEG : EXIT_DEG}deg`,
                animation: `card-out ${OUT_MS}ms ${OUT_EASE} both`,
              } as React.CSSProperties
            }
          >
            <Face card={f.card} side={f.side} commitment={1} />
          </div>
        ))}
      </div>

      {/* One row for both states, the same height, so nothing under the deck
          jumps when it ends. */}
      <div className="mt-7 flex h-14 items-center justify-center">
        {finished ? (
          <div
            key={round}
            className="flex items-center gap-3"
            style={{ animation: `blur-in ${IN_MS}ms var(--ease-entrance) 120ms backwards` }}
          >
            <Button size="lg" variant="raised" className="text-[15px]" asChild>
              <EnterOnboarding>{t("measure")}</EnterOnboarding>
            </Button>
            <Button size="lg" variant="ghost" className="text-[15px]" onClick={again}>
              <RotateCcw className="size-4" />
              {t("again")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-7">
            <Choice tone="no" label={t("no")} onClick={() => answer("left", 0)} />
            {/* Where you are, between the two answers, so the row weighs as
                much on each side as the card above it. */}
            <p
              aria-live="polite"
              aria-label={t("progress", { n: index + 1, total })}
              className="text-text-tertiary w-12 text-center text-[13px] font-medium tabular-nums"
            >
              {index + 1}
              <span className="text-text-tertiary/60"> / {total}</span>
            </p>
            <Choice tone="yes" label={t("yes")} onClick={() => answer("right", 0)} />
          </div>
        )}
      </div>
    </section>
  );
}

/** The card on top: it follows the hand, hinges, and answers when let go far enough. */
function Card({
  card,
  onAnswer,
}: {
  card: LevelCard;
  onAnswer: (side: Side, fromX: number) => void;
}) {
  const [spent, setSpent] = useState(false);
  const play = (side: Side, fromX: number) => {
    if (spent) return;
    setSpent(true);
    onAnswer(side, fromX);
  };
  const { dx, held, commitment, handleProps } = useCardDrag({ onCommit: play });
  const side: Side | null = dx === 0 ? null : dx < 0 ? "left" : "right";

  return (
    <div
      {...(spent ? {} : handleProps)}
      className={cn(
        "absolute inset-0 z-10 touch-pan-y select-none",
        spent ? "pointer-events-none opacity-0" : held ? "cursor-grabbing" : "cursor-grab",
      )}
      style={
        {
          transform: `translate3d(${dx}px, 0, 0) rotate(${dx * TILT}deg)`,
          transformOrigin: HINGE,
          // Nothing eases while held: the pointer is the animation. Let go
          // short, it settles back with the faintest overshoot.
          transition: held ? undefined : "transform 480ms cubic-bezier(0.2, 1.25, 0.35, 1)",
        } as React.CSSProperties
      }
    >
      {/* The entrance lives one layer in, never on the layer the hand moves.
          A running animation overrides the inline transform, so with both on
          one element a card grabbed while still arriving would not follow
          the pointer — which is exactly what swiping fast does (Joaquin,
          1/nov). Split, the two transforms compose: it can be rising and
          dragged at once. */}
      <div
        className="h-full"
        style={
          {
            transformOrigin: "50% 100%",
            animation: `card-in ${IN_MS}ms var(--ease-entrance) backwards`,
            "--card-behind-y": `${BEHIND.y}px`,
            "--card-behind-scale": BEHIND.scale,
          } as React.CSSProperties
        }
      >
        <Face card={card} side={side} commitment={commitment} reveal />
      </div>
    </div>
  );
}

/**
 * What a card looks like, held or flying. Laid out like the reference's: a
 * row of small tags on top (what kind of word, and the band it sits in), the
 * word as the title with how it sounds under it, open space, and a foot that
 * asks the question and, as the card is dragged, turns into the answer the
 * hand is giving.
 */
function Face({
  card,
  side,
  commitment,
  reveal = false,
}: {
  card: LevelCard;
  side: Side | null;
  commitment: number;
  /** Comes into focus as it arrives, instead of being there already. */
  reveal?: boolean;
}) {
  const t = useTranslations("levelCheck");
  // The question hands over to the answer in the first half of the drag, so
  // the two never sit on top of each other legibly.
  const handover = Math.min(commitment * 2, 1);
  const yes = side === "right" ? handover : 0;
  const no = side === "left" ? handover : 0;
  const band = card.band ?? card.looks;

  return (
    <div className={cn(SURFACE, "@container relative flex h-full flex-col overflow-hidden")}>
      {/* The side's tint, faint, as strong as the hand is sure. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          side === "right" && "bg-accent-500/[0.045]",
          side === "left" && "bg-destructive/[0.035]",
        )}
        style={{ opacity: commitment }}
      />

      <div
        className="relative flex flex-1 flex-col p-[22px] pb-0"
        style={
          reveal
            ? { animation: `blur-in ${IN_MS}ms var(--ease-entrance) 40ms backwards` }
            : undefined
        }
      >
        <div className="flex items-center justify-between gap-2">
          {card.pos && (
            <span className="bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300 rounded-[6px] px-2 py-[3px] text-[12px] font-medium">
              {card.pos}
            </span>
          )}
          {band && (
            <span className="bg-surface-secondary text-text-secondary rounded-[6px] px-2 py-[3px] text-[12px] font-medium tabular-nums">
              {band}
            </span>
          )}
        </div>

        <div className="mt-[18%]">
          {/* Sized against the card, so the longest word still fits on one
              line: about 0.56em a letter at this weight. */}
          <p
            className="font-heading text-foreground leading-[1.05] font-medium tracking-[-0.02em]"
            style={{ fontSize: `min(40px, calc((100cqw - 44px) / ${card.word.length * 0.56}))` }}
          >
            {card.word}
          </p>
          {card.ipa && <p className="text-text-tertiary mt-2 text-[15px]">{card.ipa}</p>}
          <p className="text-text-secondary mt-6 text-[16px] leading-snug">{t("question")}</p>
        </div>

        <div className="mt-auto grid py-[18px] text-[13px]">
          <span
            className="text-text-tertiary flex items-center justify-between [grid-area:1/1]"
            style={{ opacity: 1 - handover }}
          >
            {t("swipe")}
            <ArrowLeftRight className="text-text-tertiary size-4" />
          </span>
          <span
            aria-hidden
            className="text-accent-700 dark:text-accent-400 flex items-center gap-1.5 font-medium [grid-area:1/1]"
            style={{ opacity: yes }}
          >
            <Check className="size-3.5" strokeWidth={2.75} />
            {t("yes")}
          </span>
          <span
            aria-hidden
            className="text-destructive flex items-center gap-1.5 font-medium [grid-area:1/1]"
            style={{ opacity: no }}
          >
            <X className="size-3.5" strokeWidth={2.75} />
            {t("no")}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * A round answer: the side's colour as a soft fill rather than as an outline,
 * so it is found without drawing a ring around itself. No word under it — the
 * card already asks the question and the marks are the answer; the word is
 * still there for a screen reader and on hover.
 */
function Choice({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "yes" | "no";
  onClick: () => void;
}) {
  const Icon = tone === "yes" ? Check : X;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "focus-key:ring-ring flex size-14 cursor-pointer items-center justify-center rounded-full outline-none focus-key:ring-2 focus-key:ring-offset-2",
        "transition-[background-color,scale] duration-150 ease-out hover:scale-[1.06] active:scale-[0.92]",
        tone === "yes"
          ? "bg-accent-500/[0.14] text-accent-700 hover:bg-accent-500/[0.22] dark:bg-accent-400/[0.16] dark:text-accent-300 dark:hover:bg-accent-400/[0.24]"
          : "bg-destructive/[0.09] text-destructive hover:bg-destructive/[0.15] dark:bg-destructive/[0.16] dark:hover:bg-destructive/[0.24]",
      )}
    >
      <Icon className="size-6" strokeWidth={2.5} />
    </button>
  );
}

/**
 * The end of the deck, in the deck's place: the band, where it sits on the
 * scale, and how many real words were known. The invented words are named if
 * they were taken for real ones.
 */
function Result({ cards, knows }: { cards: LevelCard[]; knows: boolean[] }) {
  const t = useTranslations("levelCheck");
  const result = estimate(cards, knows);
  const at = BANDS.indexOf(result.band);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 text-center"
      style={{ animation: `blur-in ${IN_MS}ms var(--ease-entrance) 160ms backwards` }}
    >
      {/* A soft light where the card was, so the space does not read as empty. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side,var(--surface-secondary),transparent)]"
      />
      <p className="text-text-tertiary -mb-2 text-[13px]">{t("resultSubtitle")}</p>
      <p className="font-heading text-foreground text-[80px] leading-none font-semibold tracking-[-0.03em]">
        {result.band}
      </p>
      <div className="grid w-full max-w-[240px] grid-cols-6 gap-1" aria-hidden>
        {BANDS.map((band, i) => (
          <div key={band} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "h-1 w-full rounded-full",
                i <= at ? "bg-accent-500" : "bg-foreground/[0.08]",
              )}
            />
            <span
              className={cn(
                "text-[11px] tabular-nums",
                i === at ? "text-foreground font-semibold" : "text-text-tertiary",
              )}
            >
              {band}
            </span>
          </div>
        ))}
      </div>
      <p className="text-text-secondary text-[14px]">
        {t("resultBody", { known: result.known, real: result.real })}
      </p>
      {result.fooled.length > 0 && (
        <p className="text-text-tertiary max-w-[240px] text-[12px] leading-snug">
          {t("fooled", {
            count: result.fooled.length,
            words: result.fooled.map((word) => t("quote", { word })).join(", "),
          })}
        </p>
      )}
    </div>
  );
}
