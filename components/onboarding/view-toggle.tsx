"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import type { View } from "@/lib/onboarding/view-machine";
import { cn } from "@/lib/utils";

/**
 * The one control that crosses between the two views.
 *
 * **Floating, and only as wide as its own label.** The version that spanned the
 * column cut the conversation in half with a band that was not part of it — a
 * separator where there was nothing to separate.
 *
 * It carries the mark for a surface change nobody has seen yet, which is what
 * lets somebody turn the automatic switch off and still be told when something
 * happened. The mark is on the control they would press to go and look, which is
 * the only place it means anything.
 */
export function ViewToggle({
  view,
  unseen,
  label,
  updatedLabel,
  onSwitch,
}: {
  view: View;
  unseen: number;
  label: string;
  updatedLabel: string;
  onSwitch: (to: View) => void;
}) {
  const goingTo: View = view === "chat" ? "focus" : "chat";
  const Chevron = view === "chat" ? ChevronDown : ChevronUp;

  return (
    <button
      type="button"
      data-slot="view-toggle"
      data-view={view}
      data-unseen={unseen > 0 ? "true" : "false"}
      onClick={() => onSwitch(goingTo)}
      className={cn(
        "text-text-secondary relative flex items-center gap-1.5 rounded-full px-3 py-1.5",
        "bg-background/80 cursor-pointer text-sm backdrop-blur-sm outline-none",
        "transition-[color,background-color] duration-(--duration-control) ease-(--ease-standard)",
        "hover:text-foreground hover:bg-surface-secondary",
        "focus-visible:ring-ring focus-visible:ring-2",
      )}
    >
      <Chevron className="size-4" />
      <span>{label}</span>
      {unseen > 0 ? (
        <span
          aria-label={updatedLabel}
          title={updatedLabel}
          data-slot="view-toggle-mark"
          className="bg-accent-500 size-2 rounded-full"
        />
      ) : null}
    </button>
  );
}
