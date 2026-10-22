"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * What is asked before somebody walks out of the conversation.
 *
 * An alert dialog and not a plain one: it interrupts on purpose, it has exactly
 * two answers, and the escape key is not one of them — leaving is a decision and
 * closing a box by accident is not the same thing.
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
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        {/* Drawn like the cards in the thread, which are what it interrupts:
            the same face, edge and corners, the buttons at their size and in a
            row. At its old size it read as a separate product (Joaquin, 22/oct). */}
        <AlertDialog.Content
          data-slot="exit-dialog"
          className="dialog-content bg-surface-secondary fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-black/[0.06] p-5 shadow-raised dark:border-white/[0.06]"
        >
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="font-heading text-foreground text-[17px] font-semibold">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-text-secondary text-[14px] leading-normal">
              {body}
            </AlertDialog.Description>
          </div>
          <div className="flex items-center justify-end gap-2">
            {/* Staying is the primary, and it is where the eye ends: the
                recommendation is the button that stands out. */}
            <AlertDialog.Action asChild>
              <Button size="sm" variant="ghost" className="rounded-lg" onClick={onLeave}>
                {confirm}
              </Button>
            </AlertDialog.Action>
            <AlertDialog.Cancel asChild>
              <Button size="sm" variant="primary" className="rounded-lg">
                {stay}
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
