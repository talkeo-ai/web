"use client";

import { ArrowUp, AudioLines, Maximize2, MessageCircle, Mic, Phone, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
 * opción para hablar con la AI exclusivamente"). Before anything is said,
 * the two ways in side by side, the call first, since speaking is what the
 * product is for; once there is a conversation, it is the conversation.
 */
export function TalkeoView({ talkeo, t }: { talkeo: Talkeo; t: T }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-170px)] w-full max-w-[720px] flex-col lg:min-h-[calc(100dvh-120px)]">
      {talkeo.asked ? (
        <div className="flex items-center justify-end">
          <IconButton label={t("talkeo.newChat")} onClick={talkeo.reset}>
            <SquarePen className="size-[17px]" />
          </IconButton>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center pb-6 text-center">
          <div className={cn("relative", ARRIVE)} style={arrive(0)}>
            <span
              aria-hidden
              className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,oklch(0.75_0.12_240/0.45),transparent)] motion-safe:animate-[glow-breathe_4s_ease-in-out_infinite]"
            />
            <Avatar className="relative size-20 shadow-[0_0_0_4px_rgb(255_255_255),0_16px_40px_-12px_rgb(20_60_140/0.5)]" />
          </div>
          <h1
            className={cn("font-heading text-foreground mt-7 text-[30px] leading-tight font-semibold tracking-[-0.03em]", ARRIVE)}
            style={arrive(1)}
          >
            {t("talkeo.ask")}
          </h1>
          <p className={cn("text-text-secondary mt-2 max-w-md text-[16px]", ARRIVE)} style={arrive(2)}>
            {t("talkeo.askLine")}
          </p>

          <div className={cn("mt-9 grid w-full gap-3 sm:grid-cols-2", ARRIVE)} style={arrive(3)}>
            <button
              type="button"
              className="group relative isolate flex cursor-pointer flex-col items-start overflow-hidden rounded-[24px] bg-[#0E1626] p-5 text-left text-white transition-transform duration-300 ease-(--ease-entrance) hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <span
                aria-hidden
                className="absolute -top-16 -right-10 -z-10 size-48 rounded-full bg-[oklch(0.6_0.17_250/0.55)] blur-3xl transition-transform duration-700 group-hover:scale-110"
              />
              <span className="grid size-11 place-items-center rounded-full bg-white/12 ring-1 ring-white/20">
                <Phone className="size-5" />
              </span>
              <span className="font-heading mt-8 text-[18px] font-semibold">{t("talkeo.call")}</span>
              <span className="mt-1 text-[14px] text-white/65">{t("talkeo.callLine")}</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("talkeo-field")?.focus()}
              className={cn(
                CARD,
                "flex cursor-pointer flex-col items-start p-5 text-left transition-transform duration-300 ease-(--ease-entrance) hover:-translate-y-0.5 active:scale-[0.99]",
              )}
            >
              <span className="text-foreground grid size-11 place-items-center rounded-full bg-black/[0.05] dark:bg-white/10">
                <MessageCircle className="size-5" />
              </span>
              <span className="font-heading text-foreground mt-8 text-[18px] font-semibold">{t("talkeo.chat")}</span>
              <span className="text-text-secondary mt-1 text-[14px]">{t("talkeo.chatLine")}</span>
            </button>
          </div>
        </div>
      )}

      {talkeo.asked && <Thread talkeo={talkeo} t={t} roomy />}

      {/* Pinned above the fold only once there is a thread to scroll;
          before that it sits under the two ways in, covering nothing. */}
      <div className={cn("pt-3", talkeo.asked && "sticky bottom-24 lg:bottom-6")}>
        <Composer talkeo={talkeo} t={t} roomy id="talkeo-field" />
      </div>
    </div>
  );
}

function Thread({ talkeo, t, roomy = false }: { talkeo: Talkeo; t: T; roomy?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    // In the window the thread scrolls itself; in the section the page does.
    if (roomy) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    else {
      const el = viewport.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [talkeo.messages, talkeo.thinking, roomy]);

  return (
    <div ref={viewport} className={cn(roomy ? "flex-1 py-4" : "scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-3")}>
      <ol className={cn("flex flex-col", roomy ? "gap-6" : "gap-4")}>
        {talkeo.messages.map((m) =>
          m.from === "talkeo" ? (
            <li key={m.id} className="flex gap-3 motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]">
              <Avatar className="mt-0.5 size-7 shrink-0" />
              <p className={cn("text-foreground leading-[1.6]", roomy ? "text-[16px]" : "text-[14.5px]")}>{m.text}</p>
            </li>
          ) : (
            <li
              key={m.id}
              className={cn(
                "text-foreground ml-auto max-w-[80%] rounded-[20px] bg-black/[0.05] px-4 py-2.5 leading-[1.5] dark:bg-white/10",
                roomy ? "text-[16px]" : "text-[14.5px]",
                "motion-safe:animate-[bubble-in_300ms_var(--ease-entrance)_both]",
              )}
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
        <li ref={end} aria-hidden />
      </ol>
    </div>
  );
}

function Composer({ talkeo, t, roomy = false, id }: { talkeo: Talkeo; t: T; roomy?: boolean; id?: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      {!talkeo.asked && (
        <div className={cn("mb-3 flex flex-wrap gap-2", roomy && "justify-center")}>
          {MOCK_TALKEO.suggestions.map((s, i) => (
            <button
              key={s.ask}
              type="button"
              onClick={() => talkeo.say(s.ask)}
              className="bg-card text-foreground cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium shadow-[0_0_0_1px_rgb(16_24_40/0.1)] transition-colors hover:bg-black/[0.03] motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]"
              style={{ animationDelay: `${160 + i * 50}ms` }}
            >
              {s.ask}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          talkeo.say(draft);
          setDraft("");
        }}
        className={cn(
          "bg-card flex items-center gap-1 rounded-full pr-1.5 pl-5",
          "shadow-[0_0_0_1px_rgb(16_24_40/0.1)] transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_rgb(16_24_40/0.2),0_0_0_5px_rgb(16_24_40/0.04)]",
          roomy ? "h-14 shadow-[0_0_0_1px_rgb(16_24_40/0.08),0_12px_32px_-12px_rgb(16_24_40/0.2)]" : "h-12",
        )}
      >
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("talkeo.placeholder")}
          className={cn("text-foreground placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent outline-none", roomy ? "text-[16px]" : "text-[14.5px]")}
        />
        <IconButton label={t("talkeo.mic")}>
          <Mic className="size-[18px]" />
        </IconButton>
        {draft.trim() ? (
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
    </div>
  );
}
