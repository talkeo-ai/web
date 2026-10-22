"use client";

import { useTranslations } from "next-intl";

import { worthAskingAgain, type MicRefusal } from "@/lib/audio/microphone";
import { cn } from "@/lib/utils";

/**
 * Why the microphone did not open, and what to do about it.
 *
 * Under the composer, which is where a call is entered.
 *
 * ⚠ It never says the conversation carried on in writing. The copy used to
 * ("no pude usar el micrófono, así que seguimos escribiendo") and the code never
 * did it. They write by writing.
 */
export function MicNotice({
  refusal,
  className,
}: {
  refusal: MicRefusal;
  className?: string;
}) {
  const t = useTranslations("onboarding.mic");
  return (
    <p
      // Announced: it lands after a press and nothing else on screen moves.
      role="alert"
      data-slot="mic-notice"
      data-refusal={refusal}
      className={cn("text-text-secondary text-center text-sm", className)}
    >
      {t(refusal)}{" "}
      {/* Said only when it is true. Telling somebody to press again when their
          browser has stopped asking is the sentence that wastes their time. */}
      {worthAskingAgain(refusal) ? t("again") : t("orWrite")}
    </p>
  );
}
