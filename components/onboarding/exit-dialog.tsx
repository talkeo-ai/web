"use client";

import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * What is asked before somebody walks out of the conversation.
 *
 * A plain dialog, so a touch outside it or the escape key closes it, and
 * closing it is staying. It was an alert dialog that only its two buttons could
 * close, and touching outside it did nothing (Joaquin, 22/oct). Leaving still
 * takes the button: nothing outside it leaves.
 *
 * The copy is a reason to stay rather than a warning about leaving. Nothing here
 * is lost by going: the conversation is saved and resumes where it was, and
 * saying so is the honest version of a retention prompt.
 */
export function ExitDialog({
  trigger,
  title,
  body,
  stay,
  confirm,
  onLeave,
}: {
  trigger: ReactNode;
  title: string;
  body: string;
  stay: string;
  confirm: string;
  onLeave: () => void;
}) {
  // Held here so leaving can close it: Next keeps the page mounted and hidden
  // after it navigates away, and coming back found the box still open
  // (Joaquin, 22/oct).
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        {/* Drawn like the cards in the thread, which are what it interrupts:
            the same face, edge and corners, the buttons at their size and in a
            row. At its old size it read as a separate product (Joaquin, 22/oct). */}
        <Dialog.Content
          data-slot="exit-dialog"
          // The box takes focus, not its first button: a ring on "Salir igual"
          // the moment it opens read as already chosen. Tab still walks the
          // buttons from here.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          className="dialog-content outline-none bg-surface-secondary fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-black/[0.06] p-5 shadow-raised dark:border-white/[0.06]"
        >
          <div className="flex flex-col gap-1.5">
            <Dialog.Title className="font-heading text-foreground text-[17px] font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-text-secondary text-[14px] leading-normal">
              {body}
            </Dialog.Description>
          </div>
          <div className="flex items-center justify-end gap-2">
            {/* Staying is the primary, and it is where the eye ends: the
                recommendation is the button that stands out. */}
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg"
              onClick={() => {
                setOpen(false);
                onLeave();
              }}
            >
              {confirm}
            </Button>
            <Dialog.Close asChild>
              <Button size="sm" variant="primary" className="rounded-lg">
                {stay}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
