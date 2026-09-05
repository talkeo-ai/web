"use client";

import { Button } from "@/components/ui/button";
import { unlockVoice } from "@/lib/talkeo/voice";

/**
 * The door into the run, and the press that lets the assistant speak.
 *
 * Playback has to be claimed by a gesture, and this is the only one guaranteed
 * to come before the assistant's first word — it opens the conversation, so
 * there is no press of its own to wait for. The run is a client-side
 * navigation, so the element claimed here is still the one that speaks on the
 * next screen.
 *
 * Claiming it costs a silent hundredth of a second and is not required for
 * anything: refused, the turn still plays, without a voice.
 */
export function StartButton({
  action,
  label,
}: {
  action: () => Promise<never>;
  label: string;
}) {
  return (
    <form action={action}>
      <Button type="submit" size="lg" className="w-full" onClick={unlockVoice}>
        {label}
      </Button>
    </form>
  );
}
