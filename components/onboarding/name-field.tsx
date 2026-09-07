"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NAME_MAX } from "@/lib/onboarding/entry";
import { unlockVoice } from "@/lib/talkeo/voice";

/**
 * The field, its submit, and the gesture that opens the run.
 *
 * Client because Continue tracks what is in the field. Everything around it —
 * the question, the hint, the frame — is not, which is the whole reason this
 * is its own file.
 *
 * Submitting is also the only press guaranteed to come before the assistant's
 * first word, so it is where playback gets claimed: an element played once
 * during a press stays playable afterwards, which is what lets Talkeo open the
 * conversation on the screen after this one.
 *
 * Continue stays disabled on an empty field rather than accepting it and
 * complaining. There is nothing to validate here beyond having typed
 * something, and an error message under one input is noise.
 */
export function NameField({
  action,
  placeholder,
  cta,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  cta: string;
}) {
  const [name, setName] = useState("");

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <Input
        name="name"
        autoFocus
        autoComplete="given-name"
        maxLength={NAME_MAX}
        placeholder={placeholder}
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
        {cta}
      </Button>
    </form>
  );
}
