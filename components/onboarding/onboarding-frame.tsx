import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ProgressBar } from "@/components/onboarding/progress-bar";
import { Link } from "@/lib/i18n/navigation";
import {
  onboardingHref,
  positionOf,
  previousScreenWithinStep,
  type OnboardingScreen,
} from "@/lib/onboarding/screens";

/**
 * The chrome every screen of the run sits in.
 *
 * Going back is a link to a real URL rather than history manipulation, which is
 * the same reason the screen is a URL segment at all: the browser's own back
 * button has to work, and a half-finished run has to be resumable.
 */
export async function OnboardingFrame({
  screen,
  children,
}: {
  screen: OnboardingScreen;
  children: ReactNode;
}) {
  const t = await getTranslations("onboarding");
  const position = positionOf(screen);
  const previous = previousScreenWithinStep(screen);

  return (
    <main
      data-slot="onboarding-frame"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-10"
    >
      <header className="flex items-center gap-4">
        {previous ? (
          <Link
            href={onboardingHref(previous)}
            className="text-text-secondary hover:text-foreground shrink-0 text-sm transition-colors duration-(--duration-control) ease-(--ease-standard)"
          >
            {t("back")}
          </Link>
        ) : null}

        {position ? (
          <ProgressBar
            position={position.position}
            total={position.total}
            label={t("progress", position)}
          />
        ) : null}
      </header>

      {children}
    </main>
  );
}
