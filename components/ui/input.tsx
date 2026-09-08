import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Its height and radius match the `lg` button, so a field stacked over one
 * reads as a single object rather than two controls that happen to be near
 * each other.
 *
 * The edge is a real 1px border at every state and only its weight changes —
 * resting, hover, focus. A ring on focus would be a second edge outside the
 * first, which is why it reads as thickening; and the accent belongs to what
 * the product measures, not to whichever field the caret is in.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-surface-secondary text-foreground placeholder:text-text-tertiary",
        "h-[3em] w-full rounded-[1.044em] px-5 text-[16px]",
        "border-border border outline-none",
        "transition-[border-color] duration-(--duration-control) ease-(--ease-standard)",
        "hover:border-border-strong",
        "focus-visible:border-border-strong",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
