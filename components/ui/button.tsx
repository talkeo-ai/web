import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Buttons are solid objects with a lip: the face sits on top of a band of the
 * same colour a few steps darker, drawn with `box-shadow` at zero blur so it
 * keeps the face's own corner radius. Blur would turn it into a cast shadow,
 * which reads as the control floating rather than as having a side.
 *
 * Pressing moves the face down by exactly the lip's height and removes the
 * lip, so the button lands flush against the page. The travel and the fade
 * have to match, or the face detaches from its own edge mid-press.
 *
 * The lip lives on `box-shadow` and not on `border-bottom` on purpose: a
 * border participates in layout, so the two variants — one bordered, one not —
 * would end up different heights for the same `h-*`.
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2",
    "font-heading font-medium tracking-wide uppercase whitespace-nowrap",
    "cursor-pointer outline-none select-none",
    "transition-[transform,box-shadow,background-color,border-color]",
    "duration-(--duration-press-out) ease-(--ease-standard)",
    "active:duration-(--duration-press-in)",
    "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // The press is movement, so it is the one thing that goes when motion is
    // reduced — the lip stays, since it is colour and not animation.
    "motion-reduce:active:translate-y-0",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-cta-face text-cta-face-text",
          "shadow-[0_4px_0_0_var(--cta-lip)]",
          "hover:brightness-95",
          "active:translate-y-[4px] active:shadow-none",
        ],
        secondary: [
          "text-text-secondary bg-transparent",
          "border-cta-alt-border border-2",
          "shadow-[0_4px_0_0_var(--cta-alt-lip)]",
          "hover:bg-surface-secondary hover:text-foreground",
          "active:translate-y-[4px] active:shadow-none",
        ],
        ghost: "text-foreground hover:bg-surface-secondary",
      },
      // Heights are set against the width these get used at, not picked off a
      // scale: a wide control keeps its proportion around 0.13 of its own
      // width, and past that it stops reading as a button and starts reading
      // as a panel you can click.
      size: {
        sm: "h-10 rounded-xl px-5 text-[13px]",
        md: "h-11 rounded-2xl px-6 text-[14px]",
        lg: "h-12 rounded-2xl px-8 text-[15px]",
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
