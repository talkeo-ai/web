import { getTranslations } from "next-intl/server";

import { OptionCardList } from "@/components/onboarding/option-card-list";
import { ScreenHeading } from "@/components/onboarding/screen-heading";
import { SELF_ASSESSMENTS } from "@/core/contracts";
import { onboardingHref } from "@/lib/onboarding/screens";

/**
 * The first question, and the easiest one there is: it is about the visitor.
 *
 * The answer travels in the next screen's query string because the service
 * takes this and the next answer in a single call. Carrying it in the URL is
 * what keeps it out of client state, and what makes going back and changing it
 * work without anything to reset.
 *
 * The option labels are keyed by the protocol value itself, so a value with no
 * copy is a missing key rather than a silent mismatch.
 */
export async function SelfAssessmentScreen() {
  const t = await getTranslations("onboarding.selfAssessment");

  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title={t("question")} hint={t("hint")} />

      <OptionCardList
        options={SELF_ASSESSMENTS.map((value) => ({
          href: `${onboardingHref("areas")}?level=${value}`,
          label: t(`options.${value}`),
        }))}
      />
    </div>
  );
}
