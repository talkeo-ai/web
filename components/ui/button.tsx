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
 * The lip is 2px, and the depth is the whole register of the control. Twice
 * this reads as a game piece; none of it reads as a link in a box. Labels run
 * in sentence case for the same reason: caps plus letterspacing on a deep
 * button is the house style of something you play rather than something you
 * work in.
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
    "font-heading font-semibold whitespace-nowrap",
    "cursor-pointer outline-none select-none",
    "transition-[transform,box-shadow,background-color,border-color,color]",
    "duration-(--duration-press-out) ease-(--ease-standard)",
    "hover:duration-(--duration-highlight-in)",
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
          "shadow-[0_2px_0_0_var(--cta-lip)]",
          // A token and not `brightness-95`: the face is near-white in one
          // theme and near-black in the other, so a single filter moves it the
          // right way in one and imperceptibly in the other.
          "hover:bg-cta-face-hover",
          "active:translate-y-[2px] active:shadow-none",
        ],
        secondary: [
          "text-cta-alt-text bg-transparent",
          "border-cta-alt-border border",
          "shadow-[0_2px_0_0_var(--cta-alt-lip)]",
          "hover:bg-surface-secondary hover:text-foreground",
          "active:translate-y-[2px] active:shadow-none",
        ],
        ghost: "text-foreground hover:bg-surface-secondary",
      },
      // Heights are set against the width these get used at, not picked off a
      // scale: a wide control keeps its proportion around 0.13 of its own
      // width, and past that it stops reading as a button and starts reading
      // as a panel you can click.
      //
      // The label runs a step larger than the box would suggest. Sentence case
      // gave back the width that caps and letterspacing were spending, and the
      // presence has to come from somewhere: it comes from type size, not from
      // a taller control.
      //
      // `lg` states its box in `em` rather than in rem steps, and the numbers
      // are the ones it already rendered: 3em, 2em and 1.044em are 48px, 32px
      // and 16.7px at the 16px label. Nothing moves by writing them this way —
      // what it buys is that overriding the type size scales the control with
      // it, so making this pair bigger is one value and cannot distort the
      // shape. The other two keep their fixed boxes: they sit in dense
      // layouts, where a control that grows with its label is a nuisance.
      size: {
        sm: "h-10 rounded-xl px-5 text-[14px]",
        md: "h-11 rounded-2xl px-6 text-[15px]",
        lg: "h-[3em] rounded-[1.044em] px-[2em] text-[16px]",
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
