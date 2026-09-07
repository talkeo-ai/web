import { useTranslations } from "next-intl";

/**
 * What this part of the run is, said once above it.
 *
 * A card on its own asks a question without saying why it is being asked, and
 * "swipe left or right" is not something a card can teach while it is being
 * dragged. One line naming the stage and one line saying what to do with it is
 * the whole of it — anything longer becomes instructions, and instructions get
 * skipped.
 *
 * Server-rendered: it is two strings and it never changes while the stage is
 * on screen.
 */
export function StageHeading({ stage }: { stage: "items" | "verification" }) {
  const t = useTranslations(`onboarding.stages.${stage}`);

  return (
    <header className="flex flex-col gap-1 pb-6 text-center">
      <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] text-balance">
        {t("title")}
      </h2>
      <p className="text-text-secondary text-sm text-balance">{t("hint")}</p>
    </header>
  );
}
