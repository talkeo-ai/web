import { getTranslations } from "next-intl/server";

import { ScreenHeading } from "@/components/onboarding/screen-heading";

/**
 * A step the service can reach and this app cannot draw yet.
 *
 * It says so instead of showing an empty frame. Every screen past this one is
 * only reachable once its own components exist, and the step guard sends anyone
 * who types the URL back to where the run actually is.
 */
export async function NotBuiltScreen({
  namespace,
}: {
  namespace: "interview" | "notBuilt";
}) {
  const t = await getTranslations(`onboarding.${namespace}`);

  return <ScreenHeading title={t("title")} hint={t("body")} />;
}
