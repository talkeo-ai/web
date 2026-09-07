import { useTranslations } from "next-intl";

import { ModeChoice } from "@/components/onboarding/mode-choice";
import { PromptScreen } from "@/components/onboarding/prompt-screen";
import type { EntryMode } from "@/lib/session/entry-answers";

/**
 * How they want to answer.
 *
 * A server component, for the same reason as the screen before it: only the
 * pair of buttons needs the browser, and the question around them does not.
 */
export function ModeScreen({
  name,
  action,
}: {
  name: string | null;
  action: (mode: EntryMode) => Promise<void>;
}) {
  const t = useTranslations("onboarding.mode");

  return (
    <PromptScreen
      question={name ? t("questionNamed", { name }) : t("question")}
      hint={t("hint")}
    >
      <ModeChoice action={action} voice={t("voice")} text={t("text")} />
    </PromptScreen>
  );
}
