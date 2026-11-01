"use client";

import { ArrowUp, Mic, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MOCK_TALKEO, type Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { BRAND_FILL, type T } from "./ui";

type Message = { id: number; from: "talkeo" | "you"; text: string };

/** How long Talkeo "types" before a scripted answer lands. */
const REPLY_MS = 900;

/**
 * Talkeo, at hand from every section (Joaquin, 1/nov: "la AI de talkeo tipo
 * el chat en todo momento, que se pueda mostrar y ocultar"). The same bubbles
 * as the interview, so it is the same Talkeo you just talked to. Scripted for
 * now (`MOCK_TALKEO`): the suggestions answer, anything else gets a line that
 * says it is a test.
 */
export function TalkeoChat({ home, t, onClose }: { home: Home; t: T; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, from: "talkeo", text: MOCK_TALKEO.greeting(home) },
  ]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  const asked = messages.some((m) => m.from === "you");

  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const say = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    setDraft("");
    setMessages((all) => [...all, { id: all.length, from: "you", text: clean }]);
    setTyping(true);
    const answer = MOCK_TALKEO.suggestions.find((s) => s.ask === clean)?.answer ?? MOCK_TALKEO.fallback;
    window.setTimeout(() => {
      setTyping(false);
      setMessages((all) => [...all, { id: all.length, from: "talkeo", text: answer }]);
    }, REPLY_MS);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-8 rounded-full shadow-[0_0_0_2px_rgb(255_255_255),0_4px_10px_-3px_rgb(30_70_160/0.4)]" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-foreground text-[15px] leading-tight font-semibold">Talkeo</p>
          <p className="text-text-tertiary flex items-center gap-1.5 text-[12px]">
            <span className="size-1.5 rounded-full bg-[oklch(0.72_0.17_150)]" />
            {t("talkeo.status")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("talkeo.close")}
          className="text-text-secondary hover:text-foreground grid size-9 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/70"
        >
          <X className="size-[18px]" />
        </button>
      </header>

      <div
        ref={viewport}
        className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-3 [mask-image:linear-gradient(to_bottom,transparent,black_16px,black_calc(100%-16px),transparent)]"
      >
        <ol className="flex flex-col gap-2.5">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "max-w-[88%] rounded-[20px] px-3.5 py-2.5 text-[15px] leading-[1.5]",
                "motion-safe:animate-[bubble-in_380ms_var(--ease-entrance)_both]",
                m.from === "talkeo"
                  ? "bg-card text-foreground mr-auto rounded-bl-md shadow-[var(--sky-card-shadow)]"
                  : cn(BRAND_FILL, "ml-auto rounded-br-md text-white shadow-[0_8px_18px_-10px_rgb(40_90_170/0.7)]"),
              )}
            >
              {m.text}
            </li>
          ))}
          {typing && (
            <li
              aria-label={t("talkeo.typing")}
              className="bg-card mr-auto flex gap-1 rounded-[20px] rounded-bl-md px-4 py-3.5 shadow-[var(--sky-card-shadow)] motion-safe:animate-[bubble-in_300ms_var(--ease-entrance)_both]"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="bg-text-tertiary size-1.5 rounded-full motion-safe:animate-[typing-dot_1100ms_var(--ease-standard)_infinite]"
                  style={{ animationDelay: `${i * 140}ms` }}
                />
              ))}
            </li>
          )}
        </ol>
      </div>

      <div className="shrink-0 px-3 pb-3">
        {!asked && (
          <div className="mb-2.5 flex flex-wrap gap-1.5 px-1">
            {MOCK_TALKEO.suggestions.map((s, i) => (
              <button
                key={s.ask}
                type="button"
                onClick={() => say(s.ask)}
                className={cn(
                  "font-heading cursor-pointer rounded-full bg-white/75 px-3 py-1.5 text-[13px] font-medium text-[var(--brand-text)]",
                  "shadow-[0_0_0_1px_rgb(255_255_255/0.9),0_4px_12px_-6px_rgb(40_90_170/0.35)] transition-colors hover:bg-white",
                  "motion-safe:animate-[bubble-in_380ms_var(--ease-entrance)_both]",
                )}
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                {s.ask}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            say(draft);
          }}
          className="bg-card flex items-center gap-1 rounded-full py-1.5 pr-1.5 pl-4 shadow-[var(--sky-card-shadow)] transition-shadow focus-within:shadow-[var(--sky-card-shadow),0_0_0_3px_var(--brand-soft)]"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("talkeo.placeholder")}
            className="text-foreground placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button
            type="button"
            aria-label={t("talkeo.mic")}
            className="text-foreground hover:bg-surface-secondary grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors"
          >
            <Mic className="size-[18px]" />
          </button>
          <button
            type="submit"
            aria-label={t("talkeo.send")}
            disabled={!draft.trim()}
            className={cn(
              "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-white transition-[opacity,transform] duration-200",
              BRAND_FILL,
              "disabled:cursor-default disabled:opacity-35 active:scale-95",
            )}
          >
            <ArrowUp className="size-[18px]" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
