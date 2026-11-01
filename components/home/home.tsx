"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Headphones,
  House,
  Mic,
  PenLine,
  RotateCcw,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { Link } from "@/lib/i18n/navigation";
import type { AreaBar, Goal, Home as HomeData, PlanBlock, RoadUnit } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

type T = ReturnType<typeof useTranslations<"home">>;

const KIND_ICON: Record<PlanBlock["kind"], LucideIcon> = {
  speak: Mic,
  write: PenLine,
  listen: Headphones,
  read: BookOpen,
  review: RotateCcw,
};

/**
 * The cards: the word deck's white card and long blue shadow, the one
 * vocabulary the landing, the measurement and the interview already share.
 * `--sky-card-shadow` lives with the other sky styles in `globals.css`.
 */
const CARD = "bg-card rounded-[24px] shadow-[var(--sky-card-shadow)]";

/** The brand blue running into the sky's own blue, for the one card that leads. */
const LEAD_FILL =
  "bg-[linear-gradient(135deg,oklch(0.5_0.18_256)_0%,oklch(0.56_0.17_250)_45%,oklch(0.7_0.12_230)_100%)]";

/** Each block arrives a beat after the one above it, rising a little. */
function arrive(order: number): React.CSSProperties {
  return { animationDelay: `${80 + order * 70}ms` };
}
const ARRIVE = "motion-safe:animate-[home-in_720ms_var(--ease-entrance)_both]";

/**
 * The inside's home (Joaquin, 1/nov: a complete redesign, on the landing's
 * look). It stands on the same sky as the landing, the measurement and the
 * interview, so arriving here from the conversation is one more step in the
 * same place.
 *
 * What it puts first follows the product's own order for the home: "el
 * siguiente paso listo, lo gris con su acción para desbloquearlo, el pedido de
 * cuenta vivo sin bloquear" (`producto/onboarding/v2/INDEX.md`), and nothing
 * the spec rules out: no points, gems, leagues, lives or a streak that
 * threatens. The level is per area and never one letter (v5, D44); a general
 * goal has no bar, because a bar without a declared denominator is the lie the
 * product does not tell (v5).
 *
 * The data is `MOCK_HOME`, shaped like the Core's own responses; what of it is
 * real and what is mocked is written at the top of `lib/inside/mock.ts`.
 */
export function Home({ home }: { home: HomeData }) {
  const t = useTranslations("home");
  const sections = useTranslations("inside.sections");

  return (
    <div data-sky data-slot="home" className="relative isolate min-h-dvh pb-28 lg:pb-16">
      {/* Fixed, so the page scrolls over a sky that stays put instead of
          stretching one picture down the whole length of it. */}
      <div aria-hidden className="fixed inset-0 -z-10">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.18),rgb(255_255_255/0.42)_45%,rgb(255_255_255/0.62))] dark:bg-black/45" />
      </div>

      <TopBar t={t} sections={sections} home={home} />

      <main className="mx-auto w-full max-w-[1120px] px-4 pt-4 sm:px-6 lg:pt-10">
        <header className={cn("mb-6 lg:mb-8", ARRIVE)} style={arrive(0)}>
          <h1 className="font-heading text-foreground text-[34px] leading-[1.05] font-medium tracking-[-0.035em] lg:text-[48px]">
            {t("greeting", { name: home.name })}
          </h1>
          <p className="text-foreground/65 mt-2 text-[16px] lg:text-[18px]">
            {t("lead", { goal: home.plan.goal })}
          </p>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <TodayCard home={home} t={t} order={1} />
            <Road units={home.road} t={t} order={3} />
          </div>
          <aside className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <WeekCard home={home} t={t} order={2} />
            {!home.saved && <SaveCard t={t} order={3} />}
            <LevelCard bars={home.plan.bar} t={t} order={4} />
            <GoalsCard goals={home.goals} t={t} order={5} />
          </aside>
        </div>
      </main>

      <BottomNav sections={sections} />
    </div>
  );
}

const NAV: { key: "home" | "practice" | "progress" | "profile"; Icon: LucideIcon }[] = [
  { key: "home", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: TrendingUp },
  { key: "profile", Icon: User },
];

/** The glass every floating control on the sky is made of. */
const GLASS =
  "bg-white/55 shadow-[0_0_0_1px_rgb(255_255_255/0.65),0_8px_24px_-12px_rgb(40_90_170/0.35)] backdrop-blur-xl dark:bg-white/10 dark:shadow-none";

function TopBar({
  t,
  sections,
  home,
}: {
  t: T;
  sections: ReturnType<typeof useTranslations<"inside.sections">>;
  home: HomeData;
}) {
  return (
    <div className="sticky top-0 z-30 px-4 pt-3 sm:px-6">
      <nav className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-3">
        <Link
          href="/home"
          className="text-foreground font-heading flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.02em]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Talkeo"
            className="size-[30px] rounded-full shadow-[0_0_0_2px_rgb(255_255_255),0_4px_12px_-2px_rgb(30_70_160/0.35)]"
          />
          <span className="hidden sm:inline">Talkeo</span>
        </Link>

        {/* Sections, as one glass segment in the middle on a wide screen; on
            the phone they move to the bottom, under the thumb. */}
        <div className={cn("hidden items-center gap-1 rounded-full p-1 lg:flex", GLASS)}>
          {NAV.slice(0, 3).map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              aria-current={key === "home" ? "page" : undefined}
              className={cn(
                "font-heading flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium",
                "transition-[background-color,color,box-shadow] duration-(--duration-control) ease-(--ease-standard)",
                key === "home"
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgb(28_25_23/0.06),0_4px_12px_-6px_rgb(40_90_170/0.3)]"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={2} />
              {sections(key)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn("font-heading flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold", GLASS)}
            aria-label={t("streak", { days: home.dose.streak_days })}
            title={t("streak", { days: home.dose.streak_days })}
          >
            <Flame className="size-4 text-[oklch(0.7_0.17_55)]" strokeWidth={2.25} />
            <span className="text-foreground tabular-nums">{home.dose.streak_days}</span>
          </div>
          <button
            type="button"
            aria-label={t("account")}
            className="font-heading grid size-9 cursor-pointer place-items-center rounded-full bg-[linear-gradient(135deg,var(--brand),oklch(0.7_0.12_230))] text-[14px] font-semibold text-white shadow-[0_0_0_2px_rgb(255_255_255),0_6px_16px_-6px_rgb(40_90_170/0.55)]"
          >
            {home.name.slice(0, 1)}
          </button>
        </div>
      </nav>
    </div>
  );
}

function BottomNav({ sections }: { sections: ReturnType<typeof useTranslations<"inside.sections">> }) {
  return (
    <nav className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
      <div className={cn("mx-auto flex max-w-md items-center justify-between rounded-full p-1.5", GLASS)}>
        {NAV.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            aria-current={key === "home" ? "page" : undefined}
            className={cn(
              "flex h-12 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium",
              key === "home" ? "bg-card text-foreground shadow-[0_1px_2px_rgb(28_25_23/0.06)]" : "text-foreground/55",
            )}
          >
            <Icon className="size-[18px]" strokeWidth={2} />
            {sections(key)}
          </button>
        ))}
      </div>
    </nav>
  );
}

function TodayCard({ home, t, order }: { home: HomeData; t: T; order: number }) {
  const { blocks } = home.plan;
  const done = blocks.filter((b) => b.done).length;
  const current = blocks.find((b) => !b.done);
  const total = blocks.reduce((sum, b) => sum + b.minutes, 0);

  return (
    <section
      aria-label={t("today")}
      className={cn(
        "relative isolate overflow-hidden rounded-[28px] p-6 text-white sm:p-8",
        "shadow-[0_1px_2px_rgb(28_25_23/0.08),0_30px_60px_-24px_rgb(30_80_180/0.6)]",
        LEAD_FILL,
        ARRIVE,
      )}
      style={arrive(order)}
    >
      {/* Light on the card, so the fill reads as a lit surface rather than a
          flat swatch: a soft bloom in the corner and a fine top edge. */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 size-[340px] rounded-full bg-white/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-[300px] rounded-full bg-[oklch(0.8_0.1_220)]/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
        <div className="flex min-w-0 flex-col">
          <span className="font-heading inline-flex w-fit items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-[13px] font-medium ring-1 ring-white/25 backdrop-blur">
            {t("today")}
            <span className="size-1 rounded-full bg-white/70" />
            {t("minutes", { minutes: total })}
          </span>
          <h2 className="font-heading mt-4 text-[30px] leading-[1.05] font-medium tracking-[-0.03em] sm:text-[36px]">
            {home.plan.title}
          </h2>
          <p className="mt-2 text-[15px] text-white/80">{t("forGoal", { goal: home.plan.goal })}</p>

          <div className="mt-auto pt-7">
            <div className="mb-2.5 flex items-center justify-between text-[13px] text-white/80">
              <span className="tabular-nums">{t("progress", { done, total: blocks.length })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/22">
              <div
                className="h-full origin-left rounded-full bg-white motion-safe:animate-[bar-grow_1100ms_var(--ease-entrance)_both]"
                style={{ width: `${(done / blocks.length) * 100}%`, animationDelay: "420ms" }}
              />
            </div>
            <button
              type="button"
              className={cn(
                "font-heading group mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-[var(--brand-text)] sm:w-auto",
                "shadow-[0_10px_24px_-10px_rgb(10_30_90/0.55)]",
                "transition-transform duration-(--duration-press-out) ease-(--ease-standard) active:scale-[0.97] active:duration-(--duration-press-in)",
              )}
            >
              {done === 0 ? t("start") : t("continue")}
              <ArrowRight className="size-[18px] transition-transform duration-300 ease-(--ease-entrance) group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <ol className="flex flex-col gap-1.5">
          {blocks.map((block) => {
            const Icon = block.done ? Check : KIND_ICON[block.kind];
            const now = block === current;
            return (
              <li
                key={block.index}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                  now ? "bg-white text-foreground shadow-[0_8px_20px_-10px_rgb(10_30_90/0.5)]" : "bg-white/[0.08]",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    block.done && "bg-white/90 text-[var(--brand)]",
                    now && "bg-[var(--brand)] text-white",
                    !block.done && !now && "bg-white/15 text-white",
                  )}
                >
                  <Icon className="size-[17px]" strokeWidth={block.done ? 2.75 : 2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[12px] font-medium", now ? "text-[var(--brand-text)]" : "text-white/65")}>
                    {t(`kind.${block.kind}`)}
                  </span>
                  <span className={cn("block truncate text-[15px] leading-snug", block.done && "text-white/70")}>
                    {block.objective}
                  </span>
                </span>
                <span className={cn("shrink-0 text-[13px] tabular-nums", now ? "text-text-secondary" : "text-white/60")}>
                  {t("minutes", { minutes: block.minutes })}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function WeekCard({ home, t, order }: { home: HomeData; t: T; order: number }) {
  const locale = useLocale();
  // Today is read only in the browser: read while prerendering, it would be
  // frozen at whatever day the page was built. A day string, so the snapshot
  // stays the same value between renders.
  const day = useSyncExternalStore(
    noSubscribe,
    () => new Date().toDateString(),
    () => null,
  );
  const today = day ? new Date(day) : null;
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const days = home.week.map((practised, i) => {
    let label = "";
    if (today) {
      const date = new Date(today);
      date.setDate(today.getDate() - (home.week.length - 1 - i));
      label = narrow.format(date);
    }
    return { practised, label, today: i === home.week.length - 1 };
  });
  const { produced_minutes_today: produced, target_session_minutes: target } = home.dose;
  const share = Math.min(produced / target, 1);

  return (
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(order)}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-text-secondary text-[13px] font-medium">{t("week")}</h2>
          <p className="font-heading text-foreground mt-1 flex items-center gap-2 text-[22px] font-medium tracking-[-0.02em]">
            <Flame className="size-5 text-[oklch(0.7_0.17_55)]" strokeWidth={2.25} />
            {t("streak", { days: home.dose.streak_days })}
          </p>
        </div>
        <MinutesRing share={share} />
      </div>

      <ol className="mt-5 grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-full",
                day.practised
                  ? "bg-[linear-gradient(135deg,var(--brand),oklch(0.7_0.12_230))] text-white shadow-[0_4px_10px_-4px_rgb(40_90_170/0.6)]"
                  : "bg-surface-secondary text-text-tertiary",
                day.today && !day.practised && "ring-2 ring-[var(--brand)]/45 ring-offset-2 ring-offset-[var(--card)]",
              )}
            >
              {day.practised ? <Check className="size-4" strokeWidth={3} /> : null}
            </span>
            <span className={cn("text-[12px] font-medium uppercase", day.today ? "text-foreground" : "text-text-tertiary")}>
              {day.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-text-secondary mt-4 text-[13px] tabular-nums">
        {t("todayMinutes", { done: Math.round(produced), target })}
      </p>
    </section>
  );
}

const noSubscribe = () => () => {};

/** Today's minutes against the session target, as a small ring. */
function MinutesRing({ share }: { share: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="size-11 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--surface-secondary)" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - share)}
        className="motion-safe:animate-[ring-fill_1200ms_var(--ease-entrance)_both]"
        style={{ "--ring-from": `${c}`, animationDelay: "500ms" } as React.CSSProperties}
      />
    </svg>
  );
}

function SaveCard({ t, order }: { t: T; order: number }) {
  const [later, setLater] = useState(false);
  if (later) return null;
  return (
    <section
      className={cn(
        "rounded-[24px] p-5",
        "bg-[linear-gradient(160deg,rgb(255_255_255/0.85),rgb(255_255_255/0.6))] shadow-[0_0_0_1px_rgb(255_255_255/0.8),var(--sky-card-shadow)] backdrop-blur-xl",
        ARRIVE,
      )}
      style={arrive(order)}
    >
      <h2 className="font-heading text-foreground text-[17px] font-semibold tracking-[-0.01em]">{t("save.title")}</h2>
      <p className="text-text-secondary mt-1 text-[14px] leading-relaxed">{t("save.body")}</p>
      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/login"
          prefetch={false}
          className="font-heading inline-flex h-10 items-center rounded-full bg-[var(--brand)] px-5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(40_90_170/0.7)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          {t("save.cta")}
        </Link>
        <button
          type="button"
          onClick={() => setLater(true)}
          className="text-text-secondary hover:text-foreground h-10 cursor-pointer rounded-full px-4 text-[14px] font-medium transition-colors"
        >
          {t("save.later")}
        </button>
      </div>
    </section>
  );
}

function LevelCard({ bars, t, order }: { bars: AreaBar[]; t: T; order: number }) {
  return (
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(order)}>
      <h2 className="font-heading text-foreground text-[17px] font-semibold tracking-[-0.01em]">{t("level")}</h2>
      <p className="text-text-secondary mt-0.5 text-[13px]">{t("levelNote")}</p>
      <ul className="mt-4 flex flex-col gap-3.5">
        {bars.map((bar, i) => (
          <li key={bar.area}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-foreground text-[14px]">{t(`area.${bar.area}`)}</span>
              {bar.band ? (
                <span className="font-heading rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[12px] font-semibold text-[var(--brand-text)]">
                  {bar.band}
                </span>
              ) : (
                <button
                  type="button"
                  className="font-heading cursor-pointer rounded-full px-2 py-0.5 text-[12px] font-semibold text-[var(--brand-text)] ring-1 ring-[var(--brand)]/30 transition-colors hover:bg-[var(--brand-soft)]"
                >
                  {t("measure")}
                </button>
              )}
            </div>
            {/* Measured in blue; the rest hatched grey, so what is not known
                yet reads as not known rather than as zero. */}
            <div className="flex h-2 overflow-hidden rounded-full bg-[repeating-linear-gradient(135deg,var(--surface-secondary)_0_4px,var(--surface-tertiary)_4px_8px)]">
              <div
                className="h-full origin-left rounded-full bg-[linear-gradient(90deg,var(--brand),oklch(0.7_0.12_230))] motion-safe:animate-[bar-grow_1000ms_var(--ease-entrance)_both]"
                style={{ width: `${bar.measured_share * 100}%`, animationDelay: `${520 + i * 60}ms` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GoalsCard({ goals, t, order }: { goals: Goal[]; t: T; order: number }) {
  return (
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(order)}>
      <h2 className="font-heading text-foreground text-[17px] font-semibold tracking-[-0.01em]">{t("goals")}</h2>
      <ul className="mt-3 flex flex-col">
        {goals.map((goal, i) => (
          <li key={goal.goal_id} className={cn("py-3", i > 0 && "border-t border-black/[0.05] dark:border-white/[0.06]")}>
            <p className="text-foreground text-[15px] font-medium">{goal.name}</p>
            {goal.focus ? <p className="text-text-secondary text-[13px]">{goal.focus}</p> : null}
            {goal.cells ? (
              <>
                <div className="bg-surface-secondary mt-2.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full origin-left rounded-full bg-[var(--brand)] motion-safe:animate-[bar-grow_1000ms_var(--ease-entrance)_both]"
                    style={{ width: `${(goal.cells.used / goal.cells.total) * 100}%`, animationDelay: `${640 + i * 80}ms` }}
                  />
                </div>
                <p className="text-text-tertiary mt-1.5 text-[12px] tabular-nums">
                  {t("cells", { used: goal.cells.used, total: goal.cells.total })}
                </p>
              </>
            ) : (
              <p className="text-text-tertiary mt-1.5 text-[12px]">{t("open")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Road({ units, t, order }: { units: RoadUnit[]; t: T; order: number }) {
  return (
    <section className={cn("flex flex-col gap-4", ARRIVE)} style={arrive(order)}>
      <h2 className="font-heading text-foreground px-1 text-[22px] font-medium tracking-[-0.02em]">{t("road")}</h2>
      {units.map((unit, u) => {
        const done = unit.nodes.filter((n) => n.state === "done").length;
        return (
          <article key={unit.id} className={cn(CARD, "p-5 sm:p-6")}>
            <header className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-text-tertiary text-[12px] font-semibold tracking-[0.06em] uppercase">
                  {t("unit", { n: u + 1 })}
                </p>
                <h3 className="font-heading text-foreground mt-0.5 text-[20px] font-medium tracking-[-0.02em]">
                  {unit.title}
                </h3>
                <p className="text-text-secondary text-[13px]">{t("forGoal", { goal: unit.goal })}</p>
              </div>
              <span className="text-text-secondary bg-surface-secondary rounded-full px-2.5 py-1 text-[12px] font-medium tabular-nums">
                {t("progress", { done, total: unit.nodes.length })}
              </span>
            </header>

            <ol className="relative">
              {unit.nodes.map((node, i) => {
                const last = i === unit.nodes.length - 1;
                return (
                  <li key={node.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* The line to the next stop, blue as far as you have got. */}
                    {!last && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-10 bottom-0 left-[19px] w-0.5 rounded-full",
                          node.state === "done" ? "bg-[var(--brand)]/70" : "bg-surface-tertiary",
                        )}
                      />
                    )}
                    <span className="relative grid size-10 shrink-0 place-items-center">
                      {node.state === "today" && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-[var(--brand)]/35 motion-safe:animate-[ring-pulse_2400ms_var(--ease-standard)_infinite]"
                        />
                      )}
                      <span
                        className={cn(
                          "font-heading relative grid size-10 place-items-center rounded-full text-[14px] font-semibold",
                          node.state === "done" && "bg-[var(--brand)] text-white",
                          node.state === "today" &&
                            "bg-[linear-gradient(135deg,var(--brand),oklch(0.7_0.12_230))] text-white shadow-[0_0_0_4px_var(--card),0_8px_18px_-6px_rgb(40_90_170/0.7)]",
                          node.state === "next" && "bg-surface-secondary text-text-tertiary",
                        )}
                      >
                        {node.state === "done" ? <Check className="size-[18px]" strokeWidth={3} /> : i + 1}
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pt-1.5">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-[15px]",
                            node.state === "next" ? "text-text-secondary" : "text-foreground font-medium",
                          )}
                        >
                          {node.title}
                        </p>
                        <p className="text-text-tertiary text-[12px] tabular-nums">{t("minutes", { minutes: node.minutes })}</p>
                      </div>
                      {node.state === "today" && (
                        <span className="font-heading shrink-0 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-text)]">
                          {t("today")}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        );
      })}
    </section>
  );
}
