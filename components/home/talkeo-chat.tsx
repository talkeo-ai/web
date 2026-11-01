"use client";

import { ArrowUp, Maximize2, Mic, Minimize2, PanelRight, Phone, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MOCK_TALKEO, type Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { PRIMARY, type T } from "./ui";

export type Message = { id: number; from: "talkeo" | "you"; text: string };

/** How long Talkeo "thinks" before a scripted answer lands. */
const REPLY_MS = 900;

/**
 * One conversation with Talkeo for the whole inside: the floating bar, the
 * side panel and the full screen all read and write this, so moving between
 * them never loses a word. Scripted for now (`MOCK_TALKEO`).
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

function Avatar({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="" className={cn("rounded-full shadow-[0_0_0_1px_rgb(15_30_60/0.08)]", className)} />
  );
}

/**
 * The bar at the foot of every section, after the Shopify admin's Sidekick:
 * always there, one line high, out of the way. Writing in it opens the panel
 * with the question already asked.
 */
export function TalkeoBar({ t, onAsk, onOpen }: { t: T; onAsk: (text: string) => void; onOpen: () => void }) {
  const [draft, setDraft] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return onOpen();
        onAsk(draft);
        setDraft("");
      }}
      className={cn(
        "bg-card flex h-12 w-full items-center gap-1 rounded-full pr-1.5 pl-2",
        "shadow-[0_0_0_1px_rgb(15_30_60/0.08),0_12px_32px_-12px_rgb(15_30_60/0.28)]",
        "transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_rgb(15_30_60/0.14),0_16px_40px_-14px_rgb(15_30_60/0.35)]",
      )}
    >
      <Avatar className="size-7 shrink-0" />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t("talkeo.placeholder")}
        className="text-foreground placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent px-2 text-[14px] outline-none"
      />
      <IconButton label={t("talkeo.mic")}>
        <Mic className="size-[17px]" />
      </IconButton>
      <span aria-hidden className="bg-border mx-0.5 h-5 w-px" />
      <IconButton label={t("talkeo.openPanel")} onClick={onOpen}>
        <PanelRight className="size-[17px]" />
      </IconButton>
    </form>
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
        "text-text-secondary hover:text-foreground hover:bg-surface-secondary grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-150",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The side panel: the thread, its header controls and the field. */
export function TalkeoPanel({
  talkeo,
  t,
  onClose,
  onExpand,
}: {
  talkeo: Talkeo;
  t: T;
  onClose: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/[0.06] pr-2 pl-4">
        <Avatar className="size-6" />
        <p className="font-heading text-foreground min-w-0 flex-1 text-[15px] font-semibold">Talkeo</p>
        <IconButton label={t("talkeo.newChat")} onClick={talkeo.reset}>
          <SquarePen className="size-[16px]" />
        </IconButton>
        <IconButton label={t("talkeo.expand")} onClick={onExpand}>
          <Maximize2 className="size-[16px]" />
        </IconButton>
        <IconButton label={t("talkeo.close")} onClick={onClose}>
          <X className="size-[17px]" />
        </IconButton>
      </header>
      <Thread talkeo={talkeo} t={t} />
      <div className="shrink-0 border-t border-black/[0.06] p-3">
        <Field talkeo={talkeo} t={t} />
      </div>
    </div>
  );
}

/**
 * Talkeo on its own (Joaquin, 1/nov: "una opción para hablar con la AI
 * exclusivamente"): the whole canvas for the conversation, with the call as
 * the first way in, since speaking is what the product is for.
 */
export function TalkeoFull({ talkeo, t, onToPanel }: { talkeo: Talkeo; t: T; onToPanel: () => void }) {
  return (
    <div className="relative h-full w-full">
      {/* The controls sit in the canvas corner, outside the reading column. */}
      <div className="absolute top-0 right-0 z-10 flex gap-1">
        <IconButton label={t("talkeo.newChat")} onClick={talkeo.reset}>
          <SquarePen className="size-[16px]" />
        </IconButton>
        {/* A phone has no panel to fold back into. */}
        <IconButton label={t("talkeo.toPanel")} onClick={onToPanel} className="hidden lg:grid">
          <Minimize2 className="size-[16px]" />
        </IconButton>
      </div>

      <div className="mx-auto flex h-full w-full max-w-[720px] flex-col pt-8">
      {!talkeo.asked && (
        <div className="flex flex-col items-center pt-10 text-center motion-safe:animate-[home-in_560ms_var(--ease-entrance)_both]">
          <Avatar className="size-14 shadow-[0_0_0_3px_rgb(255_255_255),0_12px_28px_-10px_rgb(30_70_160/0.5)]" />
          <h1 className="font-heading text-foreground mt-5 text-[26px] font-semibold tracking-[-0.025em]">{t("talkeo.ask")}</h1>
          <p className="text-text-secondary mt-1.5 text-[15px]">{t("talkeo.askLine")}</p>
          <button type="button" className={cn(PRIMARY, "mt-6 h-11 px-5 text-[15px]")}>
            <Phone className="size-4" />
            {t("talkeo.call")}
          </button>
          <p className="text-text-tertiary mt-2 text-[13px]">{t("talkeo.callLine")}</p>
        </div>
      )}

      <Thread talkeo={talkeo} t={t} roomy />
      <div className="shrink-0 pt-2 pb-1">
        <Field talkeo={talkeo} t={t} roomy />
      </div>
      </div>
    </div>
  );
}

function Thread({ talkeo, t, roomy = false }: { talkeo: Talkeo; t: T; roomy?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [talkeo.messages, talkeo.thinking]);

  // Full screen, before anything is asked, the greeting card above says it.
  const shown = roomy && !talkeo.asked ? [] : talkeo.messages;

  return (
    <div
      ref={viewport}
      className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]"
    >
      <ol className={cn("flex flex-col", roomy ? "gap-5" : "gap-4")}>
        {shown.map((m) =>
          m.from === "talkeo" ? (
            // Talkeo's words as plain text, not a bubble: it is the voice of
            // the page, and a bubble around every answer read as chat noise.
            <li key={m.id} className="flex gap-2.5 motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]">
              <Avatar className="mt-0.5 size-6 shrink-0" />
              <p className={cn("text-foreground leading-[1.55]", roomy ? "text-[16px]" : "text-[14.5px]")}>{m.text}</p>
            </li>
          ) : (
            <li
              key={m.id}
              className={cn(
                "bg-surface-secondary text-foreground ml-auto max-w-[80%] rounded-[18px] px-3.5 py-2 leading-[1.5]",
                roomy ? "text-[16px]" : "text-[14.5px]",
                "motion-safe:animate-[bubble-in_300ms_var(--ease-entrance)_both]",
              )}
            >
              {m.text}
            </li>
          ),
        )}
        {talkeo.thinking && (
          <li aria-label={t("talkeo.typing")} className="flex items-center gap-2.5">
            <Avatar className="size-6 shrink-0 motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]" />
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

function Field({ talkeo, t, roomy = false }: { talkeo: Talkeo; t: T; roomy?: boolean }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      {!talkeo.asked && (
        <div className={cn("mb-2.5 flex flex-wrap gap-1.5", roomy && "justify-center")}>
          {MOCK_TALKEO.suggestions.map((s, i) => (
            <button
              key={s.ask}
              type="button"
              onClick={() => talkeo.say(s.ask)}
              className="text-foreground hover:bg-surface-secondary cursor-pointer rounded-full px-3 py-1.5 text-[13px] shadow-[0_0_0_1px_rgb(15_30_60/0.1)] transition-colors motion-safe:animate-[bubble-in_360ms_var(--ease-entrance)_both]"
              style={{ animationDelay: `${120 + i * 50}ms` }}
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
          "bg-card flex items-center gap-1 rounded-full pr-1.5 pl-4 shadow-[0_0_0_1px_rgb(15_30_60/0.1)] transition-shadow focus-within:shadow-[0_0_0_1px_rgb(15_30_60/0.18),0_0_0_4px_rgb(15_30_60/0.04)]",
          roomy ? "h-13" : "h-11",
        )}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("talkeo.placeholder")}
          className={cn("text-foreground placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent outline-none", roomy ? "text-[16px]" : "text-[14px]")}
        />
        <IconButton label={t("talkeo.mic")}>
          <Mic className="size-[17px]" />
        </IconButton>
        <button
          type="submit"
          aria-label={t("talkeo.send")}
          disabled={!draft.trim()}
          className="bg-foreground text-background grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-[opacity,transform] duration-200 active:scale-95 disabled:cursor-default disabled:opacity-25"
        >
          <ArrowUp className="size-4" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
