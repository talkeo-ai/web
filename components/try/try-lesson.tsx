"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  isRight,
  pick,
  sentence,
  unpick,
  type Picked,
  type TryItem,
} from "@/lib/try/lesson";
import { cn } from "@/lib/utils";

type Checked = { right: boolean } | null;

/**
 * A few sentences to translate by tapping words, playable without an account:
 * on the landing in place of the orb, and where the onboarding's "skip" leads.
 *
 * Drawn after Duolingo's first lesson (Appllama, onb_9vyd9 → onb_y43xz): the
 * sentence said by Talkeo in a bubble, two ruled lines the words land on, the
 * bank below with an empty well where a word was taken, and one button that
 * checks and then becomes "continue" on a panel that says right or wrong.
 * What is ours is the line under the answer: why the trap is a trap.
 *
 * `done` draws the closing actions, which depend on where this lives.
 */
export function TryLesson({
  done,
  className,
}: {
  done: (score: { right: number; total: number; again: () => void }) => ReactNode;
  className?: string;
}) {
  const t = useTranslations("try");
  const items = t.raw("items") as TryItem[];

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Picked>([]);
  const [checked, setChecked] = useState<Checked>(null);
  const [right, setRight] = useState(0);

  const finished = index >= items.length;
  const item = items[Math.min(index, items.length - 1)];

  const check = () => {
    const ok = isRight(item, picked);
    setChecked({ right: ok });
    if (ok) setRight((n) => n + 1);
  };
  const next = () => {
    setIndex((i) => i + 1);
    setPicked([]);
    setChecked(null);
  };
  const again = () => {
    setIndex(0);
    setPicked([]);
    setChecked(null);
    setRight(0);
  };

  return (
    <section
      aria-label={t("eyebrow")}
      className={cn(
        "bg-background relative flex w-full flex-col overflow-hidden rounded-[22px] border",
        "border-black/[0.08] dark:border-white/[0.1]",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.18)]",
        className,
      )}
    >
      <div className="flex flex-col gap-5 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-2.5">
          <p className="text-text-secondary text-[13px] font-medium">{t("eyebrow")}</p>
          <Steps total={items.length} index={index} label={t("progress", { n: Math.min(index + 1, items.length), total: items.length })} />
        </div>

        {finished ? (
          <Done
            key="done"
            title={t("doneTitle")}
            body={t("doneBody", { right, total: items.length })}
          />
        ) : (
          <div key={index} className="animate-in fade-in-0 flex flex-col gap-5 duration-300">
            <h2 className="font-heading text-foreground text-[19px] leading-tight font-semibold tracking-[-0.01em]">
              {t("title")}
            </h2>
            <Prompt text={item.prompt} />
            <Answer
              label={t("answer")}
              words={sentence(item, picked)}
              checked={checked}
              onRemove={(at) => !checked && setPicked((p) => unpick(p, p[at]))}
            />
            <Bank
              label={t("bank")}
              words={item.bank}
              used={picked}
              locked={Boolean(checked)}
              onPick={(i) => setPicked((p) => pick(p, i))}
            />
          </div>
        )}
      </div>

      <div className="mt-5">
        {finished ? (
          <div className="flex flex-col gap-2.5 px-5 pb-5 sm:px-6 sm:pb-6">
            {done({ right, total: items.length, again })}
          </div>
        ) : (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            {/* Waiting for a word, it is a quiet well rather than a dimmed
                black slab: dimmed, the solid face read as broken. */}
            <Button
              size="lg"
              variant="raised"
              className="disabled:bg-foreground/[0.07] disabled:text-text-tertiary w-full text-[16px] disabled:opacity-100 disabled:shadow-none"
              disabled={picked.length === 0 || Boolean(checked)}
              onClick={check}
            >
              {t("check")}
            </Button>
          </div>
        )}
        {!finished && checked && (
          <Feedback
            right={checked.right}
            title={checked.right ? t("correct") : t("wrong")}
            answer={checked.right ? null : item.answer.join(" ")}
            tip={item.tip}
            action={t("continue")}
            onNext={next}
          />
        )}
      </div>
    </section>
  );
}

/** One segment per step: done ones filled, the current one half-lit. */
export function Steps({ total, index, label }: { total: number; index: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(index, total)}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-500",
            i < index
              ? "bg-accent-500"
              : i === index
                ? "bg-foreground/[0.22]"
                : "bg-foreground/[0.08]",
          )}
        />
      ))}
    </div>
  );
}

/** Talkeo says the sentence: its face and a bubble pointing at it. */
function Prompt({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="size-10 shrink-0 rounded-full" />
      <p
        className={cn(
          "text-foreground relative rounded-2xl rounded-bl-md border px-4 py-2.5 text-[17px] leading-snug",
          "bg-surface-secondary border-black/[0.06] dark:border-white/[0.08]",
        )}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * Where the tapped words land: two ruled lines, so the sentence has a place to
 * be built on before the first word arrives. A tapped word goes back on tap.
 */
function Answer({
  label,
  words,
  checked,
  onRemove,
}: {
  label: string;
  words: string[];
  checked: Checked;
  onRemove: (at: number) => void;
}) {
  return (
    <div
      aria-label={label}
      className={cn(
        "flex min-h-[104px] flex-wrap content-start gap-2 pt-1",
        // The rules sit 52px apart, a tile's row; the first one under the
        // first row of words.
        "bg-[linear-gradient(to_bottom,transparent_51px,var(--color-border)_51px,var(--color-border)_52px,transparent_52px)] bg-[length:100%_52px]",
      )}
    >
      {words.map((word, at) => (
        <Tile
          key={`${word}-${at}`}
          onClick={() => onRemove(at)}
          disabled={Boolean(checked)}
          className={cn(
            "animate-in fade-in-0 zoom-in-90 duration-150",
            checked?.right &&
              "border-accent-400 bg-accent-50 text-accent-900 dark:border-accent-700 dark:bg-accent-950 dark:text-accent-100",
          )}
        >
          {word}
        </Tile>
      ))}
    </div>
  );
}

/**
 * The words on offer. A taken word leaves its well behind, the same size, so
 * nothing in the bank moves while the sentence is being built.
 */
function Bank({
  label,
  words,
  used,
  locked,
  onPick,
}: {
  label: string;
  words: string[];
  used: Picked;
  locked: boolean;
  onPick: (index: number) => void;
}) {
  return (
    <div aria-label={label} className="flex flex-wrap justify-center gap-2">
      {words.map((word, i) =>
        used.includes(i) ? (
          <span
            key={i}
            aria-hidden
            className="bg-foreground/[0.06] h-11 rounded-xl px-3.5 text-[16px] leading-[44px] font-medium text-transparent select-none"
          >
            {word}
          </span>
        ) : (
          <Tile key={i} onClick={() => onPick(i)} disabled={locked}>
            {word}
          </Tile>
        ),
      )}
    </div>
  );
}

/** A word as an object you can press: a face, an edge and a lip under it. */
function Tile({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "bg-background text-foreground h-11 cursor-pointer rounded-xl border px-3.5 text-[16px] font-medium select-none",
        "border-black/[0.12] shadow-[0_2px_0_0_var(--cta-alt-lip)] dark:border-white/[0.14]",
        "transition-[background-color,translate,box-shadow] duration-100",
        "hover:bg-surface-secondary active:translate-y-[2px] active:shadow-none",
        "focus-key:ring-ring outline-none focus-key:ring-2",
        "disabled:cursor-default disabled:hover:bg-background",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Right or wrong, on a panel that rises from the bottom edge in its colour,
 * with why under it and the way on. Wrong shows the sentence as it is said.
 */
function Feedback({
  right,
  title,
  answer,
  tip,
  action,
  onNext,
}: {
  right: boolean;
  title: string;
  answer: string | null;
  tip: string;
  action: string;
  onNext: () => void;
}) {
  const Icon = right ? Check : X;
  return (
    <div
      role="status"
      // Over the bottom of the card, not after it: the card keeps its height,
      // so nothing on the page jumps when the answer is checked. The bank it
      // covers is spent by then.
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-3 absolute inset-x-0 bottom-0 z-10 flex flex-col gap-4 px-5 pt-4 pb-5 duration-300 sm:px-6 sm:pb-6",
        right
          ? "bg-accent-100 dark:bg-accent-950"
          : "bg-[color-mix(in_oklch,var(--destructive)_10%,var(--background))]",
      )}
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            right ? "bg-accent-600 text-white" : "bg-destructive text-white",
          )}
        >
          <Icon className="size-4" strokeWidth={3} />
        </span>
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "text-[16px] font-semibold",
              right ? "text-accent-900 dark:text-accent-200" : "text-destructive",
            )}
          >
            {title}
          </p>
          {answer && <p className="text-foreground text-[16px] font-medium">{answer}</p>}
          <p className="text-text-secondary text-[14px] leading-snug">{tip}</p>
        </div>
      </div>
      <Button size="lg" variant="raised" className="w-full text-[16px]" onClick={onNext} autoFocus>
        {action}
      </Button>
    </div>
  );
}

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div className="animate-in fade-in-0 zoom-in-95 flex flex-col items-center gap-3 py-4 text-center duration-300">
      <span className="bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-300 flex size-14 items-center justify-center rounded-full">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <h2 className="font-heading text-foreground text-[21px] leading-tight font-semibold tracking-[-0.015em]">
        {title}
      </h2>
      <p className="text-text-secondary max-w-[300px] text-[15px] leading-snug">{body}</p>
    </div>
  );
}
