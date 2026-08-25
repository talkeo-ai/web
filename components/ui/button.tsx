import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The primary variant carries a vertical gradient — one step down the accent
 * ramp, around 8% of luminance. It is subtle on purpose: it gives the control
 * a slight relief that reads closer to native desktop chrome than to a flat
 * fill.
 *
 * CSS cannot interpolate `background-image`, so hovering would cut abruptly.
 * The hover gradient lives on a pseudo-element whose opacity animates instead.
 * That is why the host needs `isolate` and `overflow-hidden`.
 *
 * The press sinks fast and returns slow. That asymmetry is what makes a button
 * feel physical; a symmetric transition reads mechanical.
 */
const buttonVariants = cva(
  [
    "relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden",
    "font-medium whitespace-nowrap outline-none select-none",
    "transition-[color,background-color,border-color,box-shadow,transform]",
    "duration-(--duration-control) ease-(--ease-standard)",
    "active:scale-[0.98] active:duration-(--duration-press-in)",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "motion-reduce:active:scale-100",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-on-accent shadow-xs",
          "bg-linear-to-b from-accent-500 to-accent-600",
          "before:absolute before:inset-0 before:-z-10 before:rounded-[inherit]",
          "before:bg-linear-to-b before:from-accent-400 before:to-accent-500",
          "before:opacity-0 before:transition-opacity before:duration-(--duration-control)",
          "hover:before:opacity-100",
          "active:from-accent-600 active:to-accent-700 active:before:opacity-0",
        ],
        secondary: [
          "bg-surface-tertiary text-foreground",
          "hover:bg-surface-quaternary",
        ],
        ghost: "text-foreground hover:bg-surface-secondary",
        link: "text-accent-text underline-offset-4 hover:underline",
      },
      // Pills at every size. A capsule reads as an action on sight, which a
      // rounded rectangle has to earn from its label.
      size: {
        sm: "h-9 rounded-full px-4 text-sm",
        md: "h-10 rounded-full px-5 text-sm",
        lg: "h-12 rounded-full px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
