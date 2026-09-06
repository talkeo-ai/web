"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PromptScreen } from "@/components/onboarding/prompt-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NAME_MAX } from "@/lib/onboarding/entry";
import { unlockVoice } from "@/lib/talkeo/voice";

/**
 * The first question, and the gesture that opens the run.
 *
 * Submitting is also the only press guaranteed to come before the assistant's
 * first word, so it is where playback gets claimed — an element played once
 * during a press stays playable afterwards, which is what lets Talkeo open the
 * conversation on the screen after this one.
 *
 * Continue stays disabled on an empty field rather than accepting it and
 * complaining: there is nothing to validate here beyond having typed
 * something, and an error message under one input is noise.
 */
export function NameScreen({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("onboarding.name");
  const [name, setName] = useState("");

  return (
    <PromptScreen question={t("question")} hint={t("hint")}>
      <form action={action} className="flex w-full flex-col gap-3">
        <Input
          name="name"
          autoFocus
          autoComplete="given-name"
          maxLength={NAME_MAX}
          placeholder={t("placeholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="text-center"
        />
        {/* `md` rather than `lg`: its radius already lands on the field's, so
            the two stack as one object without matching their heights. */}
        <Button
          type="submit"
          size="md"
          disabled={name.trim().length === 0}
          onClick={unlockVoice}
        >
          {t("cta")}
        </Button>
      </form>
    </PromptScreen>
  );
}
