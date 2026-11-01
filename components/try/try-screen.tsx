"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

import { TryLesson } from "./try-lesson";

/**
 * Where the onboarding's "skip and try it" leads: the same practice as the
 * landing's, on its own page, ending on two ways on — into the product, or
 * back to the chat. The chat keeps what was said, so going back loses nothing.
 */
export function TryScreen() {
  const t = useTranslations("try");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="w-full px-4 pt-2">
        <div className="mx-auto flex w-full max-w-3xl items-center">
          <Button variant="ghost" size="sm" className="size-9 p-0" aria-label={t("close")} asChild>
            <Link href="/home" prefetch={false}>
              <X className="size-5" />
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-10 sm:items-center sm:pt-0">
        <TryLesson
          className="max-w-[460px]"
          done={() => (
            <>
              <Button size="lg" variant="raised" className="w-full text-[16px]" asChild>
                <Link href="/home" prefetch={false}>
                  {t("home")}
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="w-full text-[16px]" asChild>
                <Link href="/onboarding" prefetch={false}>
                  {t("interview")}
                </Link>
              </Button>
            </>
          )}
        />
      </main>
    </div>
  );
}
