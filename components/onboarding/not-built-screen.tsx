import { getTranslations } from "next-intl/server";

import { ScreenHeading } from "@/components/onboarding/screen-heading";
import type { OnboardingScreen } from "@/lib/onboarding/screens";

/**
 * A step the service can reach and this app cannot draw yet.
 *
 * It says so instead of showing an empty frame, with one line per screen so
 * a visitor knows which part of the run they are looking at. Each screen is
 * replaced by its own component as it gets built; the step guard sends anyone
 * who types the URL back to where the run actually is.
 */
export async function NotBuiltScreen({
  screen,
}: {
  screen: OnboardingScreen;
}) {
  const t = await getTranslations("onboarding.screens");

  return (
    <ScreenHeading title={t(`${screen}.title`)} hint={t(`${screen}.body`)} />
  );
}
