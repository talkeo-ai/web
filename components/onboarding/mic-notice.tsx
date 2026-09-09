"use client";

import { useTranslations } from "next-intl";

import { worthAskingAgain, type MicRefusal } from "@/lib/audio/microphone";
import { cn } from "@/lib/utils";

/**
 * Why the microphone did not open, and what to do about it.
 *
 * One piece for the two places a call can be entered — the mode surface and the
 * composer — because the same failure in two wordings is two failures to keep
 * true.
 *
 * ⚠ It never says the conversation carried on in writing. The copy used to
 * ("no pude usar el micrófono, así que seguimos escribiendo") and the code never
 * did it: the mode stayed on `speak`, which took the view to focus, which is the
 * view with no composer — so the sentence promising writing was rendered inside
 * the thing it was promising, and disappeared with it. Only they choose to
 * write, by pressing the other button.
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
