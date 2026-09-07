import { useTranslations } from "next-intl";

import { NameField } from "@/components/onboarding/name-field";
import { PromptScreen } from "@/components/onboarding/prompt-screen";

/**
 * The first question.
 *
 * A server component: the only part of this screen that needs the browser is
 * the field, and it lives in its own file so the question, the hint and the
 * frame ship as markup instead of as a bundle.
 */
export function NameScreen({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("onboarding.name");

  return (
    <PromptScreen question={t("question")} hint={t("hint")}>
      <NameField
        action={action}
        placeholder={t("placeholder")}
        cta={t("cta")}
      />
    </PromptScreen>
  );
}
