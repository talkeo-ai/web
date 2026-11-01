"use client";

import { useTranslations } from "next-intl";

import { EnterOnboarding } from "@/components/onboarding/enter-onboarding";
import { TryLesson } from "@/components/try/try-lesson";
import { Button } from "@/components/ui/button";

/**
 * The landing's demonstration: a practice you can play before deciding
 * anything, ending on the way in. It took the orb's place (Joaquin, 1/nov):
 * the orb showed that Talkeo does something, this lets you feel it.
 */
export function HeroTry({ className }: { className?: string }) {
  const t = useTranslations("try");
  return (
    <TryLesson
      className={className}
      done={({ again }) => (
        <>
          <Button size="lg" variant="raised" className="w-full text-[16px]" asChild>
            <EnterOnboarding>{t("measure")}</EnterOnboarding>
          </Button>
          <Button size="lg" variant="ghost" className="w-full text-[16px]" onClick={again}>
            {t("again")}
          </Button>
        </>
      )}
    />
  );
}
