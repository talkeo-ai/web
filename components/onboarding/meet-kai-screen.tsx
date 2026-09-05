"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { ScreenHeading } from "@/components/onboarding/screen-heading";
import { Button } from "@/components/ui/button";

/**
 * The last opening screen: a name, and the microphone question.
 *
 * The name is typed rather than spoken. Proper nouns are the worst class of
 * word for speech recognition, and being greeted by the wrong name is an
 * expensive way to start.
 *
 * Choosing text is a plain submit button, so it works with scripting off. Only
 * the microphone path needs scripting, because only the browser can answer that
 * question — and a refusal is shown rather than swallowed, so the visitor knows
 * why the run is about to continue in text.
 */
export function MeetKaiScreen({
  defaultName,
  action,
}: {
  defaultName: string;
  action: (formData: FormData) => void;
}) {
  const t = useTranslations("onboarding");
  const form = useRef<HTMLFormElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [pending, startTransition] = useTransition();

  async function askForMicrophone() {
    const stream = await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .catch(() => null);

    if (!stream) {
      setBlocked(true);
      return;
    }

    // The permission is the whole point; the recording is not wanted yet.
    for (const track of stream.getTracks()) track.stop();

    const data = new FormData(form.current!);
    data.set("granted", "true");
    startTransition(() => action(data));
  }

  return (
    <form ref={form} action={action} className="flex flex-col gap-8">
      <ScreenHeading title={t("meetKai.title")} hint={t("meetKai.body")} />

      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="text-sm">
          {t("meetKai.nameLabel")}
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="given-name"
          defaultValue={defaultName}
          placeholder={t("meetKai.namePlaceholder")}
          className="border-border bg-input focus-visible:ring-ring focus-visible:ring-offset-background rounded-xl border-2 px-4 py-3 transition-colors duration-(--duration-control) ease-(--ease-standard) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <p className="text-text-secondary text-xs">{t("meetKai.nameHint")}</p>
      </div>

      {blocked ? (
        <p role="status" className="text-muted-foreground text-sm">
          {t("meetKai.micBlocked")}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={askForMicrophone}
        >
          {t("meetKai.useMic")}
        </Button>

        <Button
          type="submit"
          name="granted"
          value="false"
          variant="secondary"
          size="lg"
          disabled={pending}
        >
          {t("meetKai.preferText")}
        </Button>
      </div>
    </form>
  );
}
