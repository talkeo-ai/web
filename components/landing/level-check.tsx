"use client";

import { Check, RotateCcw, X } from "lucide-react";
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
const EXIT_PX = 560;
const EXIT_DEG = 22;
const OUT_MS = 420;
const IN_MS = 520;
/** The card waiting underneath: a step smaller and lower, blank. */
const BEHIND = { scale: 0.94, y: 12 };
/** Card and deck share one hinge, so a flying ghost tips the way the card did. */
const HINGE = "50% 115%";

/** What a card is drawn with, in light and in dark. */
const SURFACE = cn(
  "bg-background rounded-[26px] border",
  "border-black/[0.06] dark:border-white/[0.09]",
  "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_22px_44px_-18px_rgb(0_0_0/0.16)]",
  "dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_22px_44px_-18px_rgb(0_0_0/0.6)]",
);

type Flying = { key: string; word: string; n: number; side: Side; fromX: number };

/**
 * The landing's demonstration: a rough level from eight words, played as a
 * deck of tall cards you swipe — right if you know the word, left if you
 * don't, or the two actions under it, or the arrow keys. Two of the words are
 * invented, which is how the yes/no method keeps "yes to everything" from
 * scoring C2 (see `lib/try/level-check.ts`).
 *
 * Its look and motion follow a reference Joaquin sent (1/nov): no frame
 * around the deck, a white card with a long soft shadow, one blank card
 * underneath, the top card hinging from below as it is dragged, and the next
 * one rising out of the blank and coming into focus rather than sliding in.
 * Leaving is drawn by the deck, not by the card, so the card can unmount
 * while its ghost is still flying.
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
    setFlying((f) => [
      ...f,
      { key: `${round}-${index}`, word: cards[index].word, n: index + 1, side, fromX },
    ]);
    setKnows((k) => [...k, side === "right"]);
  };

  const again = () => {
    setKnows([]);
    setFlying([]);
    setRound((r) => r + 1);
  };

  return (
    <section
      aria-label={t("eyebrow")}
      // Arrow keys answer while focus is anywhere in here, so a keyboard plays
      // it as fast as a thumb.
      onKeyDown={(event) => {
        if (finished) return;
        if (event.key === "ArrowLeft") answer("left", 0);
        else if (event.key === "ArrowRight") answer("right", 0);
        else return;
        event.preventDefault();
      }}
      className={cn("flex w-full flex-col items-center gap-5", className)}
    >
      <p className="text-text-tertiary text-[13px] font-medium">{t("eyebrow")}</p>

      {/* The deck: one size for every state, so finishing does not move the
          page. Width steps with the breakpoint and the height follows it. */}
      <div className="relative isolate aspect-[3/4] w-[220px] sm:w-[248px] lg:w-[272px]">
        {finished ? (
          <Result key={round} cards={cards} knows={knows} />
        ) : (
          <>
            {index < total - 1 && (
              <div
                aria-hidden
                className={cn(SURFACE, "absolute inset-0 -z-10 shadow-none")}
                style={{
                  transform: `translateY(${BEHIND.y}px) scale(${BEHIND.scale})`,
                  transformOrigin: "50% 100%",
                }}
              />
            )}
            <Card
              key={`${round}-${index}`}
              word={cards[index].word}
              n={index + 1}
              total={total}
              onAnswer={answer}
            />
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
                animation: `card-out ${OUT_MS}ms cubic-bezier(0.3, 0.6, 0.4, 1) both`,
              } as React.CSSProperties
            }
          >
            <Face word={f.word} n={f.n} total={total} side={f.side} commitment={1} />
          </div>
        ))}
      </div>

      {/* One row for both states, the same height, so nothing under the deck
          jumps when it ends. */}
      <div className="flex h-12 items-center justify-center gap-12">
        {finished ? (
          <div
            key={round}
            className="flex items-center gap-6"
            style={{ animation: `blur-in ${IN_MS}ms var(--ease-entrance) 120ms backwards` }}
          >
            <Button size="sm" variant="raised" className="h-10 px-4 text-[14px]" asChild>
              <EnterOnboarding>{t("measure")}</EnterOnboarding>
            </Button>
            <Action icon={RotateCcw} label={t("again")} onClick={again} />
          </div>
        ) : (
          <>
            <Action icon={X} label={t("no")} onClick={() => answer("left", 0)} />
            <Action icon={Check} label={t("yes")} onClick={() => answer("right", 0)} />
          </>
        )}
      </div>
    </section>
  );
}

/** The card on top: it follows the hand, hinges, and answers when let go far enough. */
function Card({
  word,
  n,
  total,
  onAnswer,
}: {
  word: string;
  n: number;
  total: number;
  onAnswer: (side: Side, fromX: number) => void;
}) {
  const t = useTranslations("levelCheck");
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
      aria-label={t("progress", { n, total })}
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
          // It rises out of the blank card that was under it. `backwards`, not
          // `both`: a fill that outlived the animation would pin the transform
          // and the card would stop following the hand.
          animation: `card-in ${IN_MS}ms var(--ease-entrance) backwards`,
          "--card-behind-y": `${BEHIND.y}px`,
          "--card-behind-scale": BEHIND.scale,
        } as React.CSSProperties
      }
    >
      <Face word={word} n={n} total={total} side={side} commitment={commitment} reveal />
    </div>
  );
}

/**
 * What a card looks like, held or flying: the count in the corner, the word,
 * and a foot that asks the question and, as the card is dragged, turns into
 * the answer the hand is giving.
 */
function Face({
  word,
  n,
  total,
  side,
  commitment,
  reveal = false,
}: {
  word: string;
  n: number;
  total: number;
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
        className="relative flex flex-1 flex-col"
        style={
          reveal
            ? { animation: `blur-in ${IN_MS}ms var(--ease-entrance) 80ms backwards` }
            : undefined
        }
      >
        <span className="text-text-tertiary self-end px-5 pt-4 text-[12px] tabular-nums">
          {n}/{total}
        </span>
        <div className="flex flex-1 items-center px-6 pb-6">
          {/* Sized against the card, so the longest word still fits on one
              line: about 0.58em a letter at this weight. */}
          <p
            className="font-heading text-foreground leading-none font-semibold tracking-[-0.025em]"
            style={{ fontSize: `min(38px, calc((100cqw - 3rem) / ${word.length * 0.58}))` }}
          >
            {word}
          </p>
        </div>
        <div className="mx-5 grid border-t border-black/[0.06] py-3.5 text-[13px] dark:border-white/[0.08]">
          <span
            className="text-text-secondary [grid-area:1/1]"
            style={{ opacity: 1 - handover }}
          >
            {t("question")}
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

/** An answer under the deck: an icon and its word, nothing around them. */
function Action({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-text-secondary hover:text-foreground focus-key:ring-ring flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1 outline-none focus-key:ring-2",
        "transition-[color,scale] duration-150 active:scale-[0.94]",
      )}
    >
      <Icon className="size-5" strokeWidth={2} />
      <span className="text-[11px] font-medium">{label}</span>
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
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
      style={{ animation: `blur-in ${IN_MS}ms var(--ease-entrance) 160ms backwards` }}
    >
      {/* A soft light where the card was, so the space does not read as empty. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,var(--surface-secondary),transparent)]"
      />
      <p className="font-heading text-foreground text-[72px] leading-none font-semibold tracking-[-0.03em]">
        {result.band}
      </p>
      <div className="flex gap-1" aria-hidden>
        {BANDS.map((band, i) => (
          <span
            key={band}
            className={cn(
              "h-1 w-5 rounded-full",
              i <= at ? "bg-accent-500" : "bg-foreground/[0.08]",
            )}
          />
        ))}
      </div>
      <p className="text-text-secondary text-[14px]">
        {t("resultBody", { known: result.known, real: result.real })}
      </p>
      {result.fooled.length > 0 && (
        <p className="text-text-tertiary max-w-[220px] text-[12px] leading-snug">
          {t("fooled", {
            count: result.fooled.length,
            words: result.fooled.map((word) => t("quote", { word })).join(", "),
          })}
        </p>
      )}
    </div>
  );
}
