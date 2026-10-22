"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import {
  openInterviewSession,
  type OpenedInterview,
} from "@/app/[locale]/(app)/onboarding/actions";
import type { Locale } from "@/lib/i18n/routing";

import { OnboardingScreen } from "./onboarding-screen";

/**
 * Getting a conversation to be in before there is a screen for it.
 *
 * The session has to exist before the socket can be opened, and opening one is a
 * mutation that writes a cookie — so it is a Server Action, called once from
 * here rather than on the server for every render. Rendering it on the server
 * would mean creating a session for anybody who so much as loads the page.
 *
 * Nothing is drawn while it opens. There is nothing honest to draw: the first
 * thing on this screen is whatever Talkeo says, and a skeleton of a
 * conversation is a shape that is never filled in the way it suggests.
 */
/**
 * The call in flight, so a remount joins it instead of making a second one.
 *
 * ⚠ React runs an effect, tears it down and runs it again. Both calls read the
 * cookie before either has written one (`actions.ts:44`), so both took the
 * "there is no session" branch and **each created an anonymous user and a
 * session** — one of which is then orphaned in the database, with nobody ever
 * to come back to it. Keyed by locale because that is what the call takes.
 */
const opening = new Map<string, Promise<OpenedInterview>>();

export function OnboardingEntry() {
  const locale = useLocale() as Locale;
  const [opened, setOpened] = useState<OpenedInterview | null>(null);

  useEffect(() => {
    let live = true;
    const already = opening.get(locale) ?? openInterviewSession(locale);
    opening.set(locale, already);
    void already.then((session) => {
      if (live) setOpened(session);
    });
    return () => {
      live = false;
    };
  }, [locale]);

  if (!opened) return <div className="h-dvh" aria-busy="true" />;
  return <OnboardingScreen opened={opened} />;
}
