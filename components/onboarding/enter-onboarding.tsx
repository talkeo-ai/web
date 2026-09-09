"use client";

import type { ReactNode } from "react";

import { unlockVoice } from "@/lib/audio/voice";
import { Link } from "@/lib/i18n/navigation";

/**
 * The way into the conversation, and the press that lets it speak.
 *
 * **This is the last gesture before Talkeo talks first**, so it is where the
 * audio context is claimed. A context built outside a gesture starts suspended
 * and stays that way, and the whole opening turn comes out silent with nothing
 * on screen to say why.
 *
 * It survives the navigation because the navigation is client-side: the module
 * holding the context is the same one on the other side of it.
 *
 * A link and not a button with a push: there is a real destination, and taking
 * that away costs the middle-click, the keyboard and the screen reader.
 */
export function EnterOnboarding({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href="/onboarding"
      prefetch={false}
      aria-label={label}
      className={className}
      // Pointer down rather than click: it is still the gesture, and it is the
      // earliest point in it — the claim is made while the navigation is still
      // being decided rather than after it.
      onPointerDown={() => void unlockVoice()}
    >
      {children}
    </Link>
  );
}
