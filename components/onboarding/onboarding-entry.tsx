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
export function OnboardingEntry() {
  const locale = useLocale() as Locale;
  const [opened, setOpened] = useState<OpenedInterview | null>(null);

  useEffect(() => {
    let live = true;
    void openInterviewSession(locale).then((session) => {
      if (live) setOpened(session);
    });
    return () => {
      live = false;
    };
  }, [locale]);

  if (!opened) return <div className="h-dvh" aria-busy="true" />;
  return <OnboardingScreen opened={opened} />;
}
