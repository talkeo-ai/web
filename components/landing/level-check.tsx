"use client";

import { ArrowLeftRight, Check, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { EnterOnboarding } from "@/components/onboarding/enter-onboarding";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { useCardDrag, type Side } from "@/lib/swipe/use-card-drag";
import {
  BANDS,
  KNOBS,
  estimate,
  nextCard,
  type Answer,
  type Next,
} from "@/lib/try/level-check";
import { cn } from "@/lib/utils";

/** Degrees per pixel of drag. The card hinges from below, so a little goes far. */
const TILT = 1 / 22;
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
 * The move from the hero to the middle of the screen, and back. Long enough
 * to be followed by the eye, on the same decelerating curve as the throw, so
 * the card that leaves and the deck that travels read as one gesture.
 */
const STAGE_MS = 720;
/**
 * The card waiting underneath: narrower and showing a strip below the top
 * one, blank. Scaled from its bottom edge so the strip is the same at any
 * card size.
 */
const BEHIND = { scale: 0.92, y: 8 };
/** Card and deck share one hinge, so a flying ghost tips the way the card did. */
const HINGE = "50% 115%";
/** Where the measurement lives as a page of its own. */
const STAGE_PATH = "/level";

/**
 * The card's surface. The proportions are the reference's (Joaquin, 1/nov),
 * measured off the recording: corners about 6% of the width.
 *
 * White on the page's warm paper, edged by a ring drawn as a shadow rather
 * than a border (a border adds to the box and greys the corner), then three
 * layers that each do one job: contact, lift, and a long soft fall tinted
 * toward the brand so the shadow belongs to the page instead of being grey.
 */
const SURFACE = cn(
  "bg-card rounded-[20px]",
  "shadow-[0_0_0_1px_rgb(28_25_23/0.06),0_1px_2px_rgb(28_25_23/0.05),0_6px_14px_-4px_rgb(28_25_23/0.07),0_28px_56px_-16px_rgb(30_70_160/0.2)]",
  "dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_1px_3px_rgb(0_0_0/0.3),0_14px_36px_-10px_rgb(0_0_0/0.55)]",
);

type Flying = { key: string; card: Next; side: Side; fromX: number };

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Moves an element that just changed place from where it was to where it is
 * now (FLIP: measure first, change, measure last, animate the inverse). The
 * layout change happens at once and only a transform runs, so nothing
 * reflows while it plays and it holds 60fps on a phone.
 */
function flip(el: HTMLElement, first: DOMRect) {
  if (reducedMotion()) return;
  const last = el.getBoundingClientRect();
  const dx = first.left + first.width / 2 - (last.left + last.width / 2);
  const dy = first.top + first.height / 2 - (last.top + last.height / 2);
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
    duration: STAGE_MS,
    easing: OUT_EASE,
  });
}

/**
 * The vocabulary measurement, played as a deck of tall cards you swipe —
 * right if you know the word, left if you don't, or the two buttons under it,
 * or the arrow keys. It runs the Core's rules (`lib/try/level-check.ts`): 30
 * words, a ladder from A2, an invented word after every five.
 *
 * It starts in the hero, and the first answer takes it to the stage
 * (Joaquin, 1/nov): the page goes to the onboarding's plain background, the
 * hero fades under it, and the deck travels to the middle of the screen, with
 * the onboarding's bar, a title and a way to skip coming in around it. The
 * URL becomes `/level` without a navigation — the same component keeps
 * playing, so nothing remounts and nothing cuts — and `/level` is also a real
 * route that renders this already on stage, so a reload or a shared link
 * lands in the same place. Back undoes the move.
 *
 * Next, not built: at the end the card gives way to the chat, and Talkeo
 * opens with the result.
 *
 * Look and motion of the deck follow a reference Joaquin sent (1/nov): one
 * blank card underneath, the top card hinging from below as it is dragged,
 * and the next one rising out of the blank and coming into focus.
 */
export function LevelCheck({
  className,
  standalone = false,
}: {
  className?: string;
  /** Rendered by `/level` itself: on stage from the start, no way back to a hero. */
  standalone?: boolean;
}) {
  const t = useTranslations("levelCheck");

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [flying, setFlying] = useState<Flying[]>([]);
  /** Bumped on "again", so the first card replays its entrance. */
  const [round, setRound] = useState(0);
  const [staged, setStaged] = useState(standalone);
  /** The height the deck held in the hero, kept while it is away so the hero does not collapse. */
  const [slot, setSlot] = useState<number | undefined>(undefined);

  const sectionRef = useRef<HTMLElement>(null);
  const next = useMemo(() => nextCard(answers), [answers]);
  const finished = next === null;
  const total = KNOBS.total;

  /** To the stage, from the hero. Called with the first answer. */
  const enterStage = useCallback((commit: () => void) => {
    const el = sectionRef.current;
    if (!el) return commit();
    const first = el.getBoundingClientRect();
    flushSync(() => {
      setSlot(first.height);
      setStaged(true);
      commit();
    });
    flip(el, first);
    const here = window.location.pathname.replace(/\/$/, "");
    window.history.pushState(null, "", `${here}${STAGE_PATH}`);
  }, []);

  /** Back to the hero, the same move reversed. */
  const leaveStage = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return setStaged(false);
    const first = el.getBoundingClientRect();
    flushSync(() => setStaged(false));
    flip(el, first);
  }, []);

  const answer = (side: Side, fromX: number) => {
    if (!next) return;
    const commit = () => {
      setFlying((f) => [...f, { key: `${round}-${answers.length}`, card: next, side, fromX }]);
      setAnswers((a) => [...a, { ...next, known: side === "right" }]);
    };
    if (!staged) enterStage(commit);
    else commit();
  };

  const again = () => {
    setAnswers([]);
    setFlying([]);
    setRound((r) => r + 1);
  };

  // While on stage: the page under it holds still, the hero's layer rises
  // above the site header, and the browser's back undoes the move.
  useEffect(() => {
    if (!staged || standalone) return;
    const root = document.documentElement;
    root.dataset.levelStage = "";
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onPop = () => {
      if (!window.location.pathname.endsWith(STAGE_PATH)) leaveStage();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      delete root.dataset.levelStage;
      root.style.overflow = overflow;
      window.removeEventListener("popstate", onPop);
    };
  }, [staged, standalone, leaveStage]);

  // On stage the arrows answer from anywhere; in the hero only with focus in
  // the deck, so they do not steal the page's own keys.
  useEffect(() => {
    if (!staged || finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      answer(event.key === "ArrowLeft" ? "left" : "right", 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={cn("w-full", className)} style={{ height: staged && !standalone ? slot : undefined }}>
      {/* A frosted veil over the hero's background, so the stage keeps the
          same sky the first screen had instead of cutting to a blank page.
          The hero's copy fades out under it on its own (`hero.tsx`), so
          nothing reflows. */}
      <div
        aria-hidden
        className={cn(
          "bg-background/35 fixed inset-0 z-10 backdrop-blur-2xl transition-opacity ease-(--ease-standard)",
          staged ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ transitionDuration: standalone ? "0ms" : `${STAGE_MS * 0.6}ms` }}
      />

      {/* The onboarding's own header, so the hand-off to the chat later
          changes nothing at the top of the screen. */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-30 w-full px-4 pt-2 transition-[opacity,translate] ease-(--ease-entrance)",
          staged ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        style={{
          transitionDuration: standalone ? "0ms" : `${STAGE_MS}ms`,
          transitionDelay: staged && !standalone ? "160ms" : "0ms",
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {standalone ? (
            <Button variant="ghost" size="sm" aria-label={t("exit")} className="size-9 shrink-0 p-0" asChild>
              <Link href="/" prefetch={false}>
                <X className="size-5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("exit")}
              className="size-9 shrink-0 p-0"
              onClick={() => window.history.back()}
              tabIndex={staged ? 0 : -1}
            >
              <X className="size-5" />
            </Button>
          )}
          <ProgressBar
            stage={answers.length}
            total={total}
            label={t("progress", { n: Math.min(answers.length + 1, total), total })}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary hover:text-foreground h-9 shrink-0 px-3 text-[14px]"
            asChild
          >
            <EnterOnboarding>{t("skip")}</EnterOnboarding>
          </Button>
        </div>
      </header>

      <section
        ref={sectionRef}
        aria-label={t("title")}
        onKeyDown={(event) => {
          if (staged || finished) return;
          if (event.key === "ArrowLeft") answer("left", 0);
          else if (event.key === "ArrowRight") answer("right", 0);
          else return;
          event.preventDefault();
        }}
        className={cn(
          "flex flex-col items-center",
          staged
            ? "fixed top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-[46%]"
            : "relative w-full",
        )}
      >
        {/* The title arrives with the stage and sits over the deck without
            taking room, so the deck's own move is the only one. */}
        <h2
          className={cn(
            "font-heading text-foreground absolute bottom-full mb-8 text-[26px] leading-none font-medium tracking-[-0.03em] whitespace-nowrap",
            "transition-[opacity,filter] ease-(--ease-entrance)",
            staged ? "opacity-100 blur-none" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          style={{
            transitionDuration: standalone ? "0ms" : `${STAGE_MS}ms`,
            transitionDelay: staged && !standalone ? "220ms" : "0ms",
          }}
          aria-hidden={!staged}
        >
          {t("stageTitle")}
        </h2>

        {/* The deck: one size for every state, so finishing does not move the
            page. Width steps with the breakpoint and the height follows it. */}
        <div className="relative isolate aspect-[4/5] w-[284px] sm:w-[300px] lg:w-[320px]">
          {!next ? (
            <Result key={round} answers={answers} />
          ) : (
            <>
              {answers.length < total - 1 && (
                <div
                  aria-hidden
                  className={cn(SURFACE, "absolute inset-0 -z-10")}
                  style={{
                    transform: `translateY(${BEHIND.y}px) scale(${BEHIND.scale})`,
                    transformOrigin: "50% 100%",
                  }}
                />
              )}
              <Card key={`${round}-${answers.length}`} card={next} onAnswer={answer} />
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

        {/* One row for both states, the same height, so nothing under the
            deck jumps when it ends. */}
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
              {/* Where you are, between the two answers, so the row weighs
                  as much on each side as the card above it. */}
              <p
                aria-live="polite"
                aria-label={t("progress", { n: answers.length + 1, total })}
                className="text-text-secondary bg-card/90 min-w-14 rounded-full px-2.5 py-1 text-center text-[13px] font-medium tabular-nums shadow-[0_0_0_1px_rgb(28_25_23/0.06)] backdrop-blur"
              >
                {answers.length + 1}
                <span className="text-text-tertiary"> / {total}</span>
              </p>
              <Choice tone="yes" label={t("yes")} onClick={() => answer("right", 0)} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** The card on top: it follows the hand, hinges, and answers when let go far enough. */
function Card({
  card,
  onAnswer,
}: {
  card: Next;
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
 * word as the title with how it sounds under it, the question, and a foot
 * that says how to answer and, as the card is dragged, turns into the answer
 * the hand is giving.
 */
function Face({
  card,
  side,
  commitment,
  reveal = false,
}: {
  card: Next;
  side: Side | null;
  commitment: number;
  /** Comes into focus as it arrives, instead of being there already. */
  reveal?: boolean;
}) {
  const t = useTranslations("levelCheck");
  // The hint hands over to the answer in the first half of the drag, so the
  // two never sit on top of each other legibly.
  const handover = Math.min(commitment * 2, 1);
  const yes = side === "right" ? handover : 0;
  const no = side === "left" ? handover : 0;
  const { word } = card;

  return (
    <div className={cn(SURFACE, "@container relative flex h-full flex-col overflow-hidden")}>
      {/* The side's tint, faint, as strong as the hand is sure. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          side === "right" && "bg-brand/[0.05]",
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
          <span className="bg-brand-soft text-brand-text rounded-[6px] px-2 py-[3px] text-[12px] font-medium">
            {t(`pos.${word.pos}`)}
          </span>
          {/* An invented word wears the band it was served at, so it cannot
              be spotted by being the one without one. */}
          <span className="bg-surface-secondary text-text-secondary rounded-[6px] px-2 py-[3px] text-[12px] font-medium tabular-nums">
            {card.shown}
          </span>
        </div>

        <div className="mt-[18%]">
          {/* Sized against the card, so the longest word still fits on one
              line: about 0.56em a letter at this weight. */}
          <p
            className="font-heading text-foreground leading-[1.05] font-medium tracking-[-0.02em]"
            style={{ fontSize: `min(40px, calc((100cqw - 44px) / ${word.word.length * 0.56}))` }}
          >
            {word.word}
          </p>
          <p className="text-text-tertiary mt-2 text-[15px]">{word.ipa}</p>
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
            className="text-brand-text flex items-center gap-1.5 font-medium [grid-area:1/1]"
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
        // Solid white, ringed and lifted like the card: on the hero these
        // sit on a painting, where a tinted wash disappears into the image.
        "bg-card shadow-[0_0_0_1px_rgb(28_25_23/0.06),0_4px_12px_-2px_rgb(28_25_23/0.14)]",
        tone === "yes" ? "text-brand-text" : "text-destructive",
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
function Result({ answers }: { answers: Answer[] }) {
  const t = useTranslations("levelCheck");
  const result = estimate(answers);
  const at = BANDS.indexOf(result.band);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 text-center"
      style={{ animation: `blur-in ${IN_MS}ms var(--ease-entrance) 160ms backwards` }}
    >
      {/* A soft light where the card was, so the space does not read as empty. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side,rgb(255_255_255/0.75),transparent)] dark:bg-[radial-gradient(closest-side,var(--surface-secondary),transparent)]"
      />
      <p className="text-text-tertiary -mb-2 text-[13px]">{t("resultSubtitle")}</p>
      <p className="font-heading text-foreground text-[88px] leading-none font-medium tracking-[-0.045em]">
        {result.band}
      </p>
      <div className="grid w-full max-w-[240px] grid-cols-6 gap-1" aria-hidden>
        {BANDS.map((band, i) => (
          <div key={band} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "h-1 w-full rounded-full",
                i <= at ? "bg-brand" : "bg-foreground/[0.08]",
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
