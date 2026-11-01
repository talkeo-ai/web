"use client";

import type { LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { GLASS } from "./ui";

/**
 * A glass segment whose white pill slides to the chosen option instead of
 * jumping: the pill is one element that moves, measured from the option it
 * lands on, so it travels the real distance at any width and in any language.
 * Written straight to the element's style, not through state, so moving it
 * costs no render.
 */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string; Icon?: LucideIcon }[];
  size?: "md" | "sm";
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const place = () => {
      const on = track.current?.querySelector<HTMLElement>(`[data-value="${value}"]`);
      if (!on || !pill.current) return;
      pill.current.style.width = `${on.offsetWidth}px`;
      pill.current.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    // The first placement is not a move: without this the pill slides in
    // from the left edge on every load.
    if (first.current && pill.current) {
      pill.current.style.transition = "none";
      place();
      void pill.current.offsetWidth;
      pill.current.style.transition = "";
      first.current = false;
    } else place();
    const observer = new ResizeObserver(place);
    if (track.current) observer.observe(track.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={track}
      role="tablist"
      className={cn("relative isolate flex items-center rounded-full p-1", GLASS, className)}
    >
      <span
        ref={pill}
        aria-hidden
        className={cn(
          "bg-card absolute top-1 bottom-1 left-0 -z-10 rounded-full",
          "shadow-[0_1px_2px_rgb(28_25_23/0.06),0_4px_12px_-6px_rgb(40_90_170/0.3)]",
          "transition-[transform,width] duration-[380ms] ease-(--ease-entrance) motion-reduce:transition-none",
        )}
      />
      {options.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          role="tab"
          data-value={v}
          aria-selected={v === value}
          onClick={() => onChange(v)}
          className={cn(
            "font-heading flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap",
            "transition-colors duration-200 ease-(--ease-standard)",
            size === "md" ? "h-9 px-4 text-[14px]" : "h-8 px-3 text-[13px]",
            v === value ? "text-foreground" : "text-foreground/55 hover:text-foreground",
          )}
        >
          {Icon ? <Icon className="size-4" strokeWidth={2} /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}
