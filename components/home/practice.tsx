"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { Link } from "@/lib/i18n/navigation";
import type { Home, SurfaceGroup, SurfaceItem } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { SurfaceArt } from "./surfaces";
import { ARRIVE, PAGE_TITLE, arrive, type T } from "./ui";

const GROUPS: SurfaceGroup[] = ["speak", "write", "listen", "play", "tools", "people"];

/** Picked for the goal: what gets you closest to it, first. Mocked choice. */
const PICKED = ["call", "roleplay", "pronunciation", "writeAndFix"];

/**
 * Every way to practise, as shelves under titles (Headspace, Blinkist and
 * Balance on Appllama, 1/nov; Joaquin: "lista horizontal ordenada por
 * títulos"). Each family is one row that slides sideways and opens into a
 * grid with "Ver todo", so a family can grow to thirty surfaces without the
 * page growing with it. What is not built yet stays on the shelf, faded.
 */
export function Practice({ home, t }: { home: Home; t: T }) {
  const byId = new Map(home.surfaces.map((s) => [s.id, s]));
  const picked = PICKED.map((id) => byId.get(id)).filter((s): s is SurfaceItem => !!s);

  return (
    <div className="flex flex-col gap-10">
      <header className={ARRIVE} style={arrive(0)}>
        <h1 className={PAGE_TITLE}>{t("practice.title")}</h1>
        <p className="text-text-secondary mt-1.5 text-[16px]">{t("practice.lead")}</p>
      </header>

      <Shelf
        order={1}
        title={t("practice.picked")}
        line={t("practice.pickedLine", { goal: home.plan.goal })}
        items={picked}
        t={t}
        large
      />

      {GROUPS.map((g, i) => (
        <Shelf
          key={g}
          order={i + 2}
          title={t(`practice.group.${g}`)}
          items={home.surfaces.filter((s) => s.group === g)}
          t={t}
        />
      ))}
    </div>
  );
}

function Shelf({
  title,
  line,
  items,
  t,
  order,
  large = false,
}: {
  title: string;
  line?: string;
  items: SurfaceItem[];
  t: T;
  order: number;
  large?: boolean;
}) {
  const [all, setAll] = useState(false);
  const row = useRef<HTMLUListElement>(null);
  const slide = (dir: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const roomy = items.length > (large ? 3 : 4);

  return (
    <section className={ARRIVE} style={arrive(Math.min(order, 6))}>
      <div className="mb-3.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-foreground text-[21px] font-semibold tracking-[-0.02em]">{title}</h2>
          {line && <p className="text-text-secondary mt-0.5 text-[14px]">{line}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {roomy && !all && (
            <div className="mr-1 hidden gap-1 sm:flex">
              <ArrowButton label={t("practice.prev")} onClick={() => slide(-1)}>
                <ChevronLeft className="size-4" />
              </ArrowButton>
              <ArrowButton label={t("practice.next")} onClick={() => slide(1)}>
                <ChevronRight className="size-4" />
              </ArrowButton>
            </div>
          )}
          {!large && roomy && (
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              className="text-foreground cursor-pointer rounded-full px-3 py-1.5 text-[14px] font-semibold transition-colors hover:bg-black/[0.05]"
            >
              {all ? t("practice.seeLess") : t("practice.seeAll")}
            </button>
          )}
        </div>
      </div>

      <ul
        ref={row}
        key={all ? "grid" : "row"}
        className={cn(
          all
            ? "grid grid-cols-2 gap-x-4 gap-y-6 motion-safe:animate-[view-in_380ms_var(--ease-entrance)_both] sm:grid-cols-3 lg:grid-cols-5"
            : // The row runs to the screen's edge on a phone, so the next card
              // peeking in says there is more.
              "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(!all && "shrink-0 snap-start", !all && (large ? "w-[78%] sm:w-[340px]" : "w-[44%] sm:w-[208px]"))}
          >
            <Card item={item} t={t} large={large} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArrowButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="bg-card text-foreground grid size-8 cursor-pointer place-items-center rounded-full shadow-[0_0_0_1px_rgb(16_24_40/0.08)] transition-transform duration-150 hover:scale-105 active:scale-95"
    >
      {children}
    </button>
  );
}

function Card({ item, t, large }: { item: SurfaceItem; t: T; large: boolean }) {
  const body = (
    <>
      <SurfaceArt
        item={item}
        size={large ? "lg" : "md"}
        className={cn(
          "w-full rounded-[22px] transition-transform duration-500 ease-(--ease-entrance)",
          large ? "aspect-[16/10]" : "aspect-[5/4]",
          !item.soon && "group-hover:scale-[1.02]",
        )}
      />
      <span className="mt-3 flex items-center gap-2">
        <span className={cn("truncate text-[15px] font-semibold", item.soon ? "text-text-secondary" : "text-foreground")}>
          {item.title}
        </span>
        {item.soon && (
          <span className="text-text-tertiary shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10">
            {t("practice.soon")}
          </span>
        )}
      </span>
      <span className="text-text-secondary mt-0.5 line-clamp-2 text-[13px] leading-snug">{item.line}</span>
      {item.minutes ? (
        <span className="text-text-tertiary mt-1 block text-[12px] font-medium tabular-nums">
          {t("minutes", { minutes: item.minutes })}
        </span>
      ) : null}
    </>
  );

  const shell = cn("group block w-full text-left", item.soon ? "cursor-default" : "cursor-pointer");
  if (item.href && !item.soon) {
    return (
      <Link href={item.href} prefetch={false} className={shell}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" disabled={item.soon} className={shell}>
      {body}
    </button>
  );
}
