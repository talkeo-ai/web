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
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <AlertDialog.Content
          data-slot="exit-dialog"
          className="bg-card fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-3xl p-6 shadow-raised"
        >
          <div className="flex flex-col gap-2">
            <AlertDialog.Title className="font-heading text-foreground text-[22px] font-bold">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-text-secondary text-[15px] leading-[1.6]">
              {body}
            </AlertDialog.Description>
          </div>
          <div className="flex flex-col gap-2">
            {/* Staying is the primary, and it is first. The order is the
                recommendation. */}
            <AlertDialog.Cancel asChild>
              <Button size="lg">{stay}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button size="lg" variant="ghost" onClick={onLeave}>
                {confirm}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
