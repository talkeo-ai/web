"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EnterOnboarding } from "@/components/onboarding/enter-onboarding";
import { Steps } from "@/components/try/try-lesson";
import { Button } from "@/components/ui/button";
import { useCardDrag, type Side } from "@/lib/swipe/use-card-drag";
import { BANDS, estimate, type LevelCard } from "@/lib/try/level-check";
import { cn } from "@/lib/utils";

/** Degrees per pixel of drag: enough to feel hinged, short of spinning. */
const TILT = 1 / 16;
/** How far an answered card flies, and how far it tips on the way. */
const EXIT_PX = 520;
const EXIT_DEG = 14;
const OUT_MS = 380;
const IN_MS = 300;
/** The cards waiting underneath, each a step smaller and lower. */
const BEHIND = [
  { scale: 0.94, y: 12 },
  { scale: 0.88, y: 24 },
];

type Flying = { key: string; word: string; side: Side; fromX: number };

/**
 * The landing's demonstration: a rough level from eight words, played as a
 * deck you swipe — right if you know the word, left if you don't, or the two
 * buttons, or the arrow keys. Two of the words are invented, which is how the
 * yes/no method keeps "yes to everything" from scoring C2 (see
 * `lib/try/level-check.ts`). It ends on the band, said as an estimate, and the
 * way into the full measurement (Joaquin, 1/nov: "cards tipo tinder para
 * medir el nivel un poco").
 *
 * The drag and the deck's motion come from the onboarding's deck of 7/sep
 * (`feat/contract-v2`): the card follows the hand and tips, springs back short
 * of an answer, and leaves from wherever it was let go while the one under it
 * rises into place. Leaving is drawn by the deck, not by the card, so the card
 * can unmount while its ghost is still flying.
 */
export function LevelCheck({ className }: { className?: string }) {
  const t = useTranslations("levelCheck");
  const cards = t.raw("cards") as LevelCard[];

  const [knows, setKnows] = useState<boolean[]>([]);
  const [flying, setFlying] = useState<Flying[]>([]);
  const index = knows.length;
  const finished = index >= cards.length;

  const answer = (side: Side, fromX: number) => {
    if (finished) return;
    setFlying((f) => [
      ...f,
      { key: `${index}-${cards[index].word}`, word: cards[index].word, side, fromX },
    ]);
    setKnows((k) => [...k, side === "right"]);
  };

  const again = () => {
    setKnows([]);
    setFlying([]);
  };

  return (
    <section
      aria-label={t("eyebrow")}
      // Arrow keys answer while focus is anywhere in the card, so a keyboard
      // plays it as fast as a thumb.
      onKeyDown={(event) => {
        if (finished) return;
        if (event.key === "ArrowLeft") answer("left", 0);
        else if (event.key === "ArrowRight") answer("right", 0);
        else return;
        event.preventDefault();
      }}
      className={cn(
        "bg-background relative flex w-full flex-col rounded-[22px] border",
        "border-black/[0.08] dark:border-white/[0.1]",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.18)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2.5 px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="text-text-secondary text-[13px] font-medium">
          {finished ? t("resultEyebrow") : t("eyebrow")}
        </p>
        <Steps
          total={cards.length}
          index={index}
          label={t("progress", { n: Math.min(index + 1, cards.length), total: cards.length })}
        />
      </div>

      {finished ? (
        <Result cards={cards} knows={knows} onAgain={again} />
      ) : (
        <div className="flex flex-col gap-9 px-5 pt-6 pb-5 sm:px-6 sm:pb-6">
          <div className="relative isolate h-[232px]">
            {/* The cards still to come, as plates: drawing the next word early
                would show it before it is asked. Fewer plates as the deck
                runs out. */}
            {BEHIND.slice(0, Math.max(0, cards.length - index - 1)).map((b, i) => (
              <div
                key={i}
                aria-hidden
                className="bg-surface-secondary absolute inset-0 rounded-[20px] border border-black/[0.05] transition-transform duration-300 dark:border-white/[0.06]"
                style={{ transform: `translateY(${b.y}px) scale(${b.scale})`, zIndex: -i }}
              />
            ))}

            <Card
              key={index}
              word={cards[index].word}
              question={t("question")}
              stamps={{ left: t("no"), right: t("yes") }}
              onAnswer={answer}
            />

            {flying.map((f) => (
              <div
                key={f.key}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20"
                onAnimationEnd={() => setFlying((all) => all.filter((x) => x.key !== f.key))}
                style={
                  {
                    "--card-from-x": `${f.fromX}px`,
                    "--card-from-rotate": `${f.fromX * TILT}deg`,
                    "--card-to-x": `${f.side === "left" ? -EXIT_PX : EXIT_PX}px`,
                    "--card-to-rotate": `${f.side === "left" ? -EXIT_DEG : EXIT_DEG}deg`,
                    animation: `card-out ${OUT_MS}ms var(--ease-exit) both`,
                  } as React.CSSProperties
                }
              >
                <Face word={f.word} side={f.side} commitment={1} stamps={{ left: t("no"), right: t("yes") }} />
              </div>
            ))}
          </div>

          <div className="flex items-start justify-center gap-10">
            <Choice
              label={t("no")}
              tone="no"
              onClick={() => answer("left", 0)}
            />
            <Choice
              label={t("yes")}
              tone="yes"
              onClick={() => answer("right", 0)}
            />
          </div>
          <p className="text-text-tertiary -mt-5 text-center text-[12px]">{t("hint")}</p>
        </div>
      )}
    </section>
  );
}

/** The card on top: it follows the hand, tips, and answers when let go far enough. */
function Card({
  word,
  question,
  stamps,
  onAnswer,
}: {
  word: string;
  question: string;
  stamps: Record<Side, string>;
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
      style={{
        transform: `translate3d(${dx}px, 0, 0) rotate(${dx * TILT}deg)`,
        // Nothing eases while held: the pointer is the animation. Let go short,
        // it springs back on the entrance curve; arriving, it rises from the
        // plate it was.
        transition: held ? undefined : `transform ${IN_MS}ms var(--ease-entrance)`,
        // `backwards`, not `both`: a fill that outlived the animation would
        // pin the transform and the card would stop following the hand.
        animation: `card-in ${IN_MS}ms var(--ease-entrance) backwards`,
        ["--card-behind-scale" as string]: BEHIND[0].scale,
      }}
    >
      <p className="sr-only">{question}</p>
      <Face word={word} side={side} commitment={commitment} question={question} stamps={stamps} />
    </div>
  );
}

/**
 * What a card looks like, held or flying: the word large in the middle, and a
 * stamp in the corner that answers the hand — the side's word, tilted, coming
 * up as the card nears letting go. The edge takes the side's colour with it.
 */
function Face({
  word,
  question,
  side,
  commitment,
  stamps,
}: {
  word: string;
  question?: string;
  side: Side | null;
  commitment: number;
  stamps: Record<Side, string>;
}) {
  return (
    <div
      className={cn(
        "bg-background relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[20px] border px-6",
        "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-14px_rgb(0_0_0/0.22)]",
        "border-black/[0.09] dark:border-white/[0.12]",
      )}
    >
      {/* The side's tint, over the whole face, as strong as the stamp. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          side === "right" && "bg-accent-500/[0.12]",
          side === "left" && "bg-destructive/[0.08]",
        )}
        style={{ opacity: commitment }}
      />
      <Stamp text={stamps.right} tone="yes" lit={side === "right" ? commitment : 0} />
      <Stamp text={stamps.left} tone="no" lit={side === "left" ? commitment : 0} />

      <p className="font-heading text-foreground relative text-[40px] leading-none font-semibold tracking-[-0.02em] wrap-anywhere sm:text-[44px]">
        {word}
      </p>
      {question && <p className="text-text-secondary relative text-[14px]">{question}</p>}
    </div>
  );
}

function Stamp({ text, tone, lit }: { text: string; tone: "yes" | "no"; lit: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-5 rounded-lg border-2 px-2.5 py-1 text-[13px] font-bold tracking-wide uppercase",
        tone === "yes"
          ? "border-accent-600 text-accent-700 dark:border-accent-500 dark:text-accent-400 left-5 -rotate-[10deg]"
          : "border-destructive text-destructive right-5 rotate-[10deg]",
      )}
      style={{ opacity: lit, transform: `scale(${0.85 + lit * 0.15})` }}
    >
      {text}
    </span>
  );
}

/** A round answer button with its word under it, in the side's colour. */
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
      className="group focus-key:ring-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-xl outline-none focus-key:ring-2"
    >
      <span
        className={cn(
          "bg-background flex size-14 items-center justify-center rounded-full border",
          "shadow-[0_2px_0_0_var(--cta-alt-lip)] transition-[translate,box-shadow,background-color] duration-100",
          "group-active:translate-y-[2px] group-active:shadow-none",
          tone === "yes"
            ? "border-accent-300 text-accent-700 group-hover:bg-accent-50 dark:border-accent-800 dark:text-accent-400 dark:group-hover:bg-accent-950"
            : "text-destructive group-hover:bg-destructive/[0.06] border-[color-mix(in_oklch,var(--destructive)_35%,transparent)]",
        )}
      >
        <Icon className="size-6" strokeWidth={2.75} />
      </span>
      <span className="text-text-secondary text-[13px] font-medium">{label}</span>
    </button>
  );
}

/**
 * The band, on the A1–C2 scale, said as what it is: an estimate from a few
 * cards. The invented words are named if they were taken for real ones.
 */
function Result({
  cards,
  knows,
  onAgain,
}: {
  cards: LevelCard[];
  knows: boolean[];
  onAgain: () => void;
}) {
  const t = useTranslations("levelCheck");
  const result = estimate(cards, knows);
  const at = BANDS.indexOf(result.band);

  return (
    <div className="animate-in fade-in-0 zoom-in-[0.98] flex flex-col gap-5 px-5 pt-6 pb-5 duration-300 sm:px-6 sm:pb-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-heading text-foreground text-[64px] leading-none font-semibold tracking-[-0.03em]">
          {result.band}
        </p>
        <div className="grid w-full grid-cols-6 gap-1.5" aria-hidden>
          {BANDS.map((band, i) => (
            <div key={band} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-full rounded-full",
                  i <= at ? "bg-accent-500" : "bg-foreground/[0.08]",
                )}
              />
              <span
                className={cn(
                  "text-[12px] tabular-nums",
                  i === at ? "text-foreground font-semibold" : "text-text-tertiary",
                )}
              >
                {band}
              </span>
            </div>
          ))}
        </div>
        <p className="text-text-secondary max-w-[320px] text-[14px] leading-snug">
          {t("resultBody", { known: result.known, real: result.real })}
        </p>
        {result.fooled.length > 0 && (
          <p className="bg-surface-secondary text-text-secondary rounded-xl px-3.5 py-2.5 text-[13px] leading-snug">
            {t("fooled", {
              count: result.fooled.length,
              words: result.fooled.map((word) => t("quote", { word })).join(", "),
            })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        <Button size="lg" variant="raised" className="w-full text-[16px]" asChild>
          <EnterOnboarding>{t("measure")}</EnterOnboarding>
        </Button>
        <Button size="lg" variant="ghost" className="w-full text-[16px]" onClick={onAgain}>
          {t("again")}
        </Button>
      </div>
    </div>
  );
}
