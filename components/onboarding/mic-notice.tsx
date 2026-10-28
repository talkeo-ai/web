"use client";

import { useTranslations } from "next-intl";

import {
  worthAskingAgain,
  type CallFailure,
  type MicRefusal,
} from "@/lib/audio/room-call";
import { cn } from "@/lib/utils";

/**
 * Why the call did not start, and what to do about it: the microphone not
 * opening, or the room not letting them in.
 *
 * The two are told apart by `from` and not by their names, because both have a
 * "busy" and they are different sentences: another app holding the microphone,
 * and a call that is already open for this conversation.
 *
 * Under the composer, which is where a call is entered.
 *
 * ⚠ It never says the conversation carried on in writing. The copy used to
 * ("no pude usar el micrófono, así que seguimos escribiendo") and the code never
 * did it. They write by writing.
 */
export type CallNotice =
  | { from: "mic"; refusal: MicRefusal }
  | { from: "room"; failure: CallFailure };

export function MicNotice({
  notice,
  className,
}: {
  notice: CallNotice;
  className?: string;
}) {
  const t = useTranslations("onboarding.mic");
  const mic = notice.from === "mic";
  const reason = mic ? notice.refusal : notice.failure;
  // Pressing again is worth it when something changes between presses: a
  // microphone they can still allow, or a token that is asked for anew. A room
  // that is busy or down is not fixed by pressing.
  const again = mic ? worthAskingAgain(notice.refusal) : reason === "expired";
  return (
    <p
      // Announced: it lands after a press and nothing else on screen moves.
      role="alert"
      data-slot="mic-notice"
      data-refusal={reason}
      className={cn("text-text-secondary text-center text-sm", className)}
    >
      {mic ? t(reason as MicRefusal) : t(`room.${reason as CallFailure}`)}{" "}
      {/* Said only when it is true. Telling somebody to press again when their
          browser has stopped asking is the sentence that wastes their time. */}
      {again ? t("again") : t("orWrite")}
    </p>
  );
}
