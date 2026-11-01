"use client";

import { ArrowUp, AudioLines, Maximize2, Mic, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { MOCK_TALKEO, type Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { ARRIVE, CARD, arrive, type T } from "./ui";

export type Message = { id: number; from: "talkeo" | "you"; text: string };

/** How long Talkeo "thinks" before a scripted answer lands. */
const REPLY_MS = 900;

/**
 * One conversation with Talkeo for the whole inside: the floating window and
 * the Talkeo section read and write the same thread, so moving between them
 * never loses a word. Scripted for now (`MOCK_TALKEO`).
 */
export function useTalkeo(home: Home) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, from: "talkeo", text: MOCK_TALKEO.greeting(home) },
  ]);
  const [thinking, setThinking] = useState(false);

  const say = (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    setMessages((all) => [...all, { id: all.length, from: "you", text: clean }]);
    setThinking(true);
    const answer = MOCK_TALKEO.suggestions.find((s) => s.ask === clean)?.answer ?? MOCK_TALKEO.fallback;
    window.setTimeout(() => {
      setThinking(false);
      setMessages((all) => [...all, { id: all.length, from: "talkeo", text: answer }]);
    }, REPLY_MS);
  };

  const reset = () => setMessages([{ id: 0, from: "talkeo", text: MOCK_TALKEO.greeting(home) }]);

  return { messages, thinking, say, reset, asked: messages.some((m) => m.from === "you") };
}

export type Talkeo = ReturnType<typeof useTalkeo>;

export function Avatar({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="" className={cn("rounded-full shadow-[0_0_0_1px_rgb(16_24_40/0.08)]", className)} />
  );
}

function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "text-text-secondary hover:text-foreground grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-150 hover:bg-black/[0.05] dark:hover:bg-white/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Talkeo at hand from every section, the way Speak keeps its tutor: a round
 * face in the corner, not a panel and not a button in the header (Joaquin,
 * 1/nov: the show/hide button "se ve raro... buscaría otra manera"). It turns
 * into a close mark while the window is open.
 */
export function TalkeoBubble({ open, onClick, t }: { open: boolean; onClick: () => void; t: T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? t("talkeo.close") : t("talkeo.open")}
      title={`${open ? t("talkeo.close") : t("talkeo.open")} (⌘J)`}
      className={cn(
        "group relative grid size-14 cursor-pointer place-items-center rounded-full",
        "shadow-[0_0_0_3px_rgb(255_255_255),0_12px_28px_-8px_rgb(20_50_120/0.45)] dark:shadow-[0_0_0_3px_rgb(30_30_30),0_12px_28px_-8px_rgb(0_0_0/0.6)]",
        "transition-transform duration-300 ease-(--ease-entrance) hover:scale-[1.06] active:scale-95",
        open ? "bg-foreground" : "bg-card",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className={cn(
          "absolute inset-0 size-full rounded-full transition-[opacity,transform] duration-300 ease-(--ease-entrance)",
          open ? "scale-50 rotate-45 opacity-0" : "scale-100 opacity-100",
        )}
      />
      <X
        className={cn(
          "text-background size-5 transition-[opacity,transform] duration-300 ease-(--ease-entrance)",
          open ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-45 opacity-0",
        )}
        strokeWidth={2.5}
      />
    </button>
  );
}

/** The window the bubble opens: grows out of the corner it lives in. */
export function TalkeoWindow({
  talkeo,
  t,
  open,
  onClose,
  onExpand,
}: {
  talkeo: Talkeo;
  t: T;
  open: boolean;
  onClose: () => void;
  onExpand: () => void;
}) {
  return (
    <section
      aria-label="Talkeo"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        CARD,
        "flex flex-col overflow-hidden rounded-[28px] shadow-[0_0_0_1px_rgb(16_24_40/0.06),0_24px_64px_-16px_rgb(16_24_40/0.3)]",
        "origin-bottom-right transition-[opacity,scale,translate] duration-[380ms] ease-(--ease-entrance)",
        open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-[0.92] opacity-0",
      )}
    >
      <header className="flex h-[60px] shrink-0 items-center gap-2.5 pr-2 pl-4">
        <Avatar className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-foreground text-[15px] leading-tight font-semibold">Talkeo</p>
          <p className="text-text-tertiary flex items-center gap-1.5 text-[12px]">
            <span className="size-1.5 rounded-full bg-[oklch(0.72_0.17_150)]" />
            {t("talkeo.status")}
          </p>
        </div>
        <IconButton label={t("talkeo.newChat")} onClick={talkeo.reset}>
          <SquarePen className="size-[17px]" />
        </IconButton>
        <IconButton label={t("talkeo.expand")} onClick={onExpand} className="hidden lg:grid">
          <Maximize2 className="size-[17px]" />
        </IconButton>
        <IconButton label={t("talkeo.close")} onClick={onClose}>
          <X className="size-[18px]" />
        </IconButton>
      </header>
      <Thread talkeo={talkeo} t={t} />
      <div className="shrink-0 px-3 pt-1 pb-3">
        <Composer talkeo={talkeo} t={t} />
      </div>
    </section>
  );
}

/**
 * Talkeo on its own, for talking only to the AI (Joaquin, 1/nov: "una
 * opción para hablar con la AI exclusivamente"), dressed like the
 * onboarding's interview (1/nov: "no debe ser scrolleable y me gustaría que
 * sea como el del onboarding"): the sky behind, one screen tall, the
 * conversation in the middle and the field with the round mic at the bottom.
 */
export function TalkeoView({ talkeo, t }: { talkeo: Talkeo; t: T }) {
  return (
    // `data-sky` borrows the onboarding's look from `globals.css`: white
    // cards for Talkeo, your answer in blue, the field as a white pill. The
    // page does not scroll here (the rule keyed on `talkeo-view`); only the
    // conversation does, fading at its edges, as in the interview.
    <div data-sky data-slot="talkeo-view">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-white/25 dark:bg-black/40" />
      </div>

      <div className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-[760px] flex-col px-4 pb-[96px] sm:px-6 lg:pb-6">
        <Thread talkeo={talkeo} t={t} sky />

        <div className="shrink-0 pt-2">
          {talkeo.asked && (
            <div className="mb-2 flex justify-center">
              <button
                type="button"
                onClick={talkeo.reset}
                className="text-foreground/70 hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-[13px] font-medium backdrop-blur-md transition-colors hover:bg-white/85 dark:bg-black/30"
              >
                <SquarePen className="size-3.5" />
                {t("talkeo.newChat")}
              </button>
            </div>
          )}
          <Composer talkeo={talkeo} t={t} sky id="talkeo-field" />
        </div>
      </div>
    </div>
  );
}

function Thread({ talkeo, t, sky = false }: { talkeo: Talkeo; t: T; sky?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [talkeo.messages, talkeo.thinking]);

  return (
    <div
      ref={viewport}
      className={cn("scroll-quiet min-h-0 flex-1 overflow-y-auto", sky ? "-mx-4 px-4 pt-8 pb-4 sm:-mx-8 sm:px-8" : "px-4 py-3")}
    >
      {sky && (
        <div className="mb-8 flex flex-col items-center text-center">
          <Avatar className={cn("size-16 shadow-[0_0_0_4px_rgb(255_255_255/0.8),0_16px_40px_-12px_rgb(20_60_140/0.45)]", ARRIVE)} />
          <h1
            className={cn("font-heading text-foreground mt-5 text-[28px] leading-tight font-semibold tracking-[-0.03em]", ARRIVE)}
            style={arrive(1)}
          >
            {t("talkeo.ask")}
          </h1>
          <p className={cn("text-foreground/70 mt-1.5 max-w-md text-[16px]", ARRIVE)} style={arrive(2)}>
            {t("talkeo.askLine")}
          </p>
        </div>
      )}
      <ol className={cn("flex flex-col", sky ? "gap-4" : "gap-4")}>
        {talkeo.messages.map((m) =>
          sky ? (
            <li
              key={m.id}
              data-slot="bubble"
              data-from={m.from}
              className={cn(
                "max-w-[85%] px-5 py-3.5 text-[17px] leading-[1.6] motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]",
                m.from === "you" ? "ml-auto w-fit text-white" : "text-foreground mr-auto",
              )}
            >
              {m.text}
              {m.from === "talkeo" && <span className="text-text-tertiary mt-1.5 block text-xs font-medium">Talkeo</span>}
            </li>
          ) : m.from === "talkeo" ? (
            <li key={m.id} className="flex gap-3 motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]">
              <Avatar className="mt-0.5 size-7 shrink-0" />
              <p className="text-foreground text-[14.5px] leading-[1.6]">{m.text}</p>
            </li>
          ) : (
            <li
              key={m.id}
              className="text-foreground ml-auto max-w-[80%] rounded-[20px] bg-black/[0.05] px-4 py-2.5 text-[14.5px] leading-[1.5] motion-safe:animate-[bubble-in_300ms_var(--ease-entrance)_both] dark:bg-white/10"
            >
              {m.text}
            </li>
          ),
        )}
        {talkeo.thinking && (
          <li aria-label={t("talkeo.typing")} className="flex items-center gap-3">
            <Avatar className="size-7 shrink-0" />
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="bg-text-tertiary size-1.5 rounded-full motion-safe:animate-[typing-dot_1100ms_var(--ease-standard)_infinite]"
                  style={{ animationDelay: `${i * 140}ms` }}
                />
              ))}
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}

function Composer({ talkeo, t, sky = false, id }: { talkeo: Talkeo; t: T; sky?: boolean; id?: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      {!talkeo.asked && (
        <div className={cn("mb-3 flex flex-wrap gap-2", sky && "justify-center")}>
          {MOCK_TALKEO.suggestions.map((s, i) => (
            <button
              key={s.ask}
              type="button"
              onClick={() => talkeo.say(s.ask)}
              className={cn(
                "bg-card text-foreground cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium transition-[background-color,transform] duration-200 hover:bg-black/[0.03] active:scale-[0.97] motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]",
                sky ? "px-4 text-[14px] shadow-[var(--sky-card-shadow)]" : "shadow-[0_0_0_1px_rgb(16_24_40/0.1)]",
              )}
              style={{ animationDelay: `${160 + i * 50}ms` }}
            >
              {s.ask}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2.5">
      <form
        data-slot={sky ? "composer" : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          talkeo.say(draft);
          setDraft("");
        }}
        className={cn(
          "bg-card flex min-w-0 flex-1 items-center gap-1 rounded-full pr-1.5 pl-5",
          "shadow-[0_0_0_1px_rgb(16_24_40/0.1)] transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_rgb(16_24_40/0.2),0_0_0_5px_rgb(16_24_40/0.04)]",
          sky ? "h-14" : "h-12",
        )}
      >
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("talkeo.placeholder")}
          className={cn("text-foreground placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent outline-none", sky ? "text-[17px]" : "text-[14.5px]")}
        />
        {!sky && (
          <IconButton label={t("talkeo.mic")}>
            <Mic className="size-[18px]" />
          </IconButton>
        )}
        {sky ? (
          draft.trim() ? (
            <button
              type="submit"
              aria-label={t("talkeo.send")}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--brand)] text-white transition-transform duration-200 active:scale-95"
            >
              <ArrowUp className="size-[18px]" strokeWidth={2.5} />
            </button>
          ) : null
        ) : draft.trim() ? (
          <button
            type="submit"
            aria-label={t("talkeo.send")}
            className="bg-foreground text-background grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-transform duration-200 active:scale-95"
          >
            <ArrowUp className="size-[18px]" strokeWidth={2.5} />
          </button>
        ) : (
          // With nothing written, the round button starts a call instead,
          // the way voice-first assistants do.
          <button
            type="button"
            aria-label={t("talkeo.call")}
            title={t("talkeo.call")}
            className="bg-foreground text-background grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-transform duration-200 active:scale-95"
          >
            <AudioLines className="size-[18px]" />
          </button>
        )}
      </form>
      {/* The interview's round mic, beside the field: speaking is the
          first way in, so it is the biggest thing here. */}
      {sky && (
        <button
          type="button"
          aria-label={t("talkeo.mic")}
          title={t("talkeo.mic")}
          className="grid size-14 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--brand)] text-white shadow-[0_14px_30px_-12px_var(--brand)] transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <Mic className="size-6" />
        </button>
      )}
      </div>
    </div>
  );
}
