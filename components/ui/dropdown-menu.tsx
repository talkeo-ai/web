"use client";

import { CheckIcon } from "lucide-react";
import { DropdownMenu as Primitive, Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * `modal` defaults to false here.
 *
 * A modal menu locks the page while it is open, which is right for a dialog
 * and wrong for a menu in a header: the scrollbar vanishes and the page stops
 * responding to the wheel for as long as it is open.
 */
function DropdownMenu({
  modal = false,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="dropdown-menu" modal={modal} {...props} />;
}

function DropdownMenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn(
        "flex items-center gap-2 outline-none",
        "text-text-secondary hover:text-foreground",
        "transition-colors duration-(--duration-control) ease-(--ease-standard)",
        "focus-visible:ring-ring rounded-md focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground z-50 min-w-40 overflow-hidden rounded-xl border p-1 shadow-sm",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof Primitive.CheckboxItem>) {
  return (
    <Primitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(
        "relative flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none select-none",
        // A step lighter than the menu itself: matching its own background is
        // how a hover state ends up invisible.
        "data-highlighted:bg-surface-quaternary",
        "transition-colors duration-(--duration-control) ease-(--ease-standard)",
        className,
      )}
      {...props}
    >
      {/* The indicator is a sibling of `children`, which is two elements — one
          more than `asChild` can slot. Wrapping the caller's child marks which
          of the two the item should merge into. */}
      <Slot.Slottable>{children}</Slot.Slottable>
      <Primitive.ItemIndicator>
        <CheckIcon className="size-4" />
      </Primitive.ItemIndicator>
    </Primitive.CheckboxItem>
  );
}

/**
 * The tail that ties the panel to whatever opened it. Radix positions and
 * flips it along with the content, so it stays pointed at the trigger even
 * when the panel has to swap sides near a viewport edge.
 */
function DropdownMenuArrow({
  className,
  width = 16,
  height = 8,
  ...props
}: React.ComponentProps<typeof Primitive.Arrow>) {
  return (
    <Primitive.Arrow
      data-slot="dropdown-menu-arrow"
      width={width}
      height={height}
      className={cn("fill-popover", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
};
