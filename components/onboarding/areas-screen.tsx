"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ScreenHeading } from "@/components/onboarding/screen-heading";
import { Button } from "@/components/ui/button";
import { AREAS, type Area, type SelfAssessment } from "@/core/contracts";
import { cn } from "@/lib/utils";

/**
 * The second question: several answers allowed, or all of them.
 *
 * This is where both opening answers are sent, because the service takes them
 * together. The first one rides in as a hidden field, straight from the URL.
 *
 * The controls are real checkboxes with the label doing the drawing, so
 * keyboard and screen readers get the semantics for free and selection survives
 * without scripting. The only thing scripting adds is holding the submit until
 * there is an answer.
 */
export function AreasScreen({
  selfAssessment,
  action,
}: {
  selfAssessment: SelfAssessment;
  action: (formData: FormData) => void;
}) {
  const t = useTranslations("onboarding");
  const [chosen, setChosen] = useState<Area[]>([]);
  const [everything, setEverything] = useState(false);

  const answered = everything || chosen.length > 0;

  function toggle(area: Area) {
    setChosen((current) =>
      current.includes(area)
        ? current.filter((value) => value !== area)
        : [...current, area],
    );
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="selfAssessment" value={selfAssessment} />

      <ScreenHeading title={t("areas.question")} hint={t("areas.hint")} />

      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">{t("areas.question")}</legend>

        <div data-slot="area-chips" className="flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <Chip
              key={area}
              value={area}
              label={t(`areas.options.${area}`)}
              checked={chosen.includes(area)}
              // Everything already covers each one, so the parts go quiet
              // rather than pretending to be a separate answer.
              disabled={everything}
              onChange={() => toggle(area)}
            />
          ))}
        </div>

        <Chip
          value="all"
          label={t("areas.all")}
          checked={everything}
          onChange={() => setEverything((current) => !current)}
        />
      </fieldset>

      <Button type="submit" size="lg" disabled={!answered}>
        {t("continue")}
      </Button>
    </form>
  );
}

function Chip({
  value,
  label,
  checked,
  disabled,
  onChange,
}: {
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "border-border bg-card-quiet inline-flex cursor-pointer items-center rounded-full border-2 px-4 py-2 text-sm transition-colors duration-(--duration-control) ease-(--ease-standard)",
        checked && "border-accent-text text-accent-text",
        disabled && "cursor-not-allowed opacity-40",
        "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
      )}
    >
      <input
        type="checkbox"
        name="areas"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
