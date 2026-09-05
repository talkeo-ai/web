import { getFormatter, getTranslations } from "next-intl/server";

import { voiceProviders } from "@/lib/voice-providers";

/**
 * What happens to the visitor's voice, said before the microphone is used.
 *
 * The provider names come from configuration and are joined in the locale's
 * own way; the sentence around them is copy. With nothing configured there is
 * nothing to disclose yet, and the line stays out rather than naming a blank.
 */
export async function ConsentLine() {
  const providers = voiceProviders();
  if (providers.length === 0) return null;

  const t = await getTranslations("onboarding");
  const format = await getFormatter();

  return (
    <p className="text-text-secondary text-xs">
      {t("consent", { providers: format.list(providers, { type: "conjunction" }) })}
    </p>
  );
}
