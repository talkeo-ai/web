"use client";

import { Check, Play, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { Link } from "@/lib/i18n/navigation";
import type { Home, PlanBlock, SurfaceItem } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { GROUP_ART, SURFACE_ICON } from "./surfaces";
import { ARRIVE, CARD, CARD_TITLE, LABEL, PAGE_TITLE, PRIMARY, arrive, type T } from "./ui";

const noSubscribe = () => () => {};
/** Today, read only in the browser: read while prerendering it would freeze at build day. */
function useToday() {
  const day = useSyncExternalStore(noSubscribe, () => new Date().toDateString(), () => null);
  return day ? new Date(day) : null;
}

/**
 * Today is the day's list and nothing else (Joaquin, 1/nov: "simplemente la
 * lista de hoy y ya, tipo un Duo o Speak, pero simplificado"). One card: the
 * class, how far you are, and its steps in order, each one naming the surface
 * it is done in. The streak lives in the header, Talkeo in its corner; the
 * only thing beside the list is the account ask.
 */
export function Today({ home, t }: { home: Home; t: T }) {
  const locale = useLocale();
  const today = useToday();
  const date = today
    ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(today)
    : " ";

  return (
    <div className="flex flex-col gap-6">
      <header className={ARRIVE} style={arrive(0)}>
        <p className="text-text-secondary text-[14px] font-medium first-letter:uppercase">{date}</p>
        <h1 className={cn(PAGE_TITLE, "mt-1")}>{t("greeting", { name: home.name })}</h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Lesson home={home} t={t} />
        {!home.saved && <Save t={t} />}
      </div>
    </div>
  );
}

function Lesson({ home, t }: { home: Home; t: T }) {
  const { blocks } = home.plan;
  const surfaces = new Map(home.surfaces.map((s) => [s.id, s]));
  const done = blocks.filter((b) => b.done).length;
  const current = blocks.find((b) => !b.done);
  const total = blocks.reduce((sum, b) => sum + b.minutes, 0);
  const left = blocks.filter((b) => !b.done).reduce((sum, b) => sum + b.minutes, 0);

  return (
    <section className={cn(CARD, "min-w-0 overflow-hidden", ARRIVE)} style={arrive(1)}>
      <div className="flex items-start gap-5 p-5 sm:p-7">
        <div className="min-w-0 flex-1">
          <p className={LABEL}>
            {t("hero.label")} · {home.plan.goal}
          </p>
          <h2 className="font-heading text-foreground mt-1.5 text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[30px]">
            {home.plan.title}
          </h2>
          <p className="text-text-secondary mt-2 text-[14px] tabular-nums">
            {t("minutes", { minutes: total })}
            {left > 0 && <> · {t("hero.left", { minutes: left })}</>}
          </p>
        </div>
        <Ring done={done} total={blocks.length} label={t("hero.steps", { done, total: blocks.length })} />
      </div>

      <ol className="border-t border-black/[0.05] dark:border-white/[0.06]">
        {blocks.map((b, i) => (
          <Step
            key={b.index}
            block={b}
            n={i + 1}
            last={i === blocks.length - 1}
            now={b === current}
            started={done > 0}
            surface={surfaces.get(b.surface)}
            t={t}
          />
        ))}
      </ol>
    </section>
  );
}

/** How many steps are done, as a thin ring with the count inside. */
function Ring({ done, total, label }: { done: number; total: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-[60px] shrink-0 place-items-center" role="img" aria-label={label}>
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="3.5" className="stroke-black/[0.06] dark:stroke-white/10" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="stroke-[var(--brand)] transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - done / total)}
        />
      </svg>
      <span className="font-heading text-foreground text-[15px] font-semibold tabular-nums">
        {done}
        <span className="text-text-tertiary">/{total}</span>
      </span>
    </div>
  );
}

/**
 * One step: where it stands on the line (done, now, ahead), the surface it is
 * done in with its icon, what you do and how long. The one you are on carries
 * the only button on the page.
 */
function Step({
  block,
  n,
  last,
  now,
  started,
  surface,
  t,
}: {
  block: PlanBlock;
  n: number;
  last: boolean;
  now: boolean;
  started: boolean;
  surface: SurfaceItem | undefined;
  t: T;
}) {
  const art = surface ? GROUP_ART[surface.group] : null;
  const Icon = surface ? (SURFACE_ICON[surface.id] ?? GROUP_ART[surface.group].icon) : null;

  return (
    <li
      className={cn(
        "relative flex items-center gap-4 px-5 py-4 sm:px-7 motion-safe:animate-[home-in_520ms_var(--ease-entrance)_both]",
        now && "bg-[oklch(0.97_0.015_250)] dark:bg-white/[0.04]",
      )}
      style={{ animationDelay: `${200 + n * 55}ms` }}
    >
      {/* The line that joins the steps, behind the markers. */}
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute top-[calc(50%+14px)] left-[34px] h-[calc(100%-28px)] w-px sm:left-[42px]",
            block.done ? "bg-foreground/70" : "bg-black/[0.08] dark:bg-white/10",
          )}
        />
      )}

      <span
        className={cn(
          "relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums",
          block.done && "bg-foreground text-background",
          now && "bg-[var(--brand)] text-white shadow-[0_0_0_4px_oklch(0.9_0.04_250)] dark:shadow-none",
          !block.done && !now && "bg-card text-text-tertiary shadow-[inset_0_0_0_1.5px_rgb(0_0_0/0.1)] dark:shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.15)]",
        )}
      >
        {block.done ? <Check className="size-3.5" strokeWidth={3} /> : n}
      </span>

      {Icon && art && (
        <span
          aria-hidden
          className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", art.chip, block.done && "opacity-50")}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={cn("text-[12.5px] font-semibold", now ? "text-[var(--brand-text)]" : "text-text-tertiary")}>
          {surface?.title ?? t(`kind.${block.kind}`)}
        </p>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-[15px] leading-snug sm:truncate",
            block.done ? "text-text-tertiary" : "text-foreground",
            now && "font-semibold",
          )}
        >
          {block.objective}
        </p>
      </div>

      {now ? (
        <button
          type="button"
          aria-label={started ? t("continue") : t("start")}
          className={cn(PRIMARY, "size-10 shrink-0 px-0 text-[14px] sm:w-auto sm:px-4")}
        >
          <Play className="size-3.5 translate-x-px fill-current sm:translate-x-0" />
          <span className="hidden sm:inline">{started ? t("continue") : t("start")}</span>
        </button>
      ) : (
        <span className="text-text-tertiary shrink-0 text-[13px] tabular-nums">{t("minutes", { minutes: block.minutes })}</span>
      )}
    </li>
  );
}

/** The account ask: present, never in the way (onboarding v2, step 7). */
function Save({ t }: { t: T }) {
  const [gone, setGone] = useState(false);
  const [closing, setClosing] = useState(false);
  if (gone) return null;
  return (
    <section
      className={cn(CARD, "relative p-5", ARRIVE, closing && "pointer-events-none !animate-[view-out_240ms_var(--ease-standard)_both]")}
      style={arrive(2)}
      onAnimationEnd={() => closing && setGone(true)}
    >
      <button
        type="button"
        aria-label={t("save.later")}
        title={t("save.later")}
        onClick={() => setClosing(true)}
        className="text-text-tertiary hover:text-foreground absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full transition-colors hover:bg-black/[0.05]"
      >
        <X className="size-4" />
      </button>
      <p className={cn(CARD_TITLE, "pr-8")}>{t("save.title")}</p>
      <p className="text-text-secondary mt-1 text-[14px] leading-snug">{t("save.body")}</p>
      <Link href="/login" prefetch={false} className={cn(PRIMARY, "mt-4 h-10 w-full text-[14px]")}>
        {t("save.cta")}
      </Link>
    </section>
  );
}
