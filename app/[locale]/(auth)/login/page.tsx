import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { BrandLink } from "@/components/auth/brand-link";
import { SignInCard, type SignInError } from "@/components/auth/sign-in-card";
import { NervousActivity } from "@/components/landing/nervous-activity";
import { safeNext } from "@/lib/session/next-path";

/**
 * One screen to sign in and to sign up.
 *
 * Two columns from `lg`: the card, and beside it what an account is for, over
 * the same mark the landing plays with. On a phone the card comes first and the
 * reasons follow: someone who came to sign in should not scroll to do it. Less
 * bare than the old Talkeo's title-and-two-buttons, which Joaquin found too
 * minimal (28/oct), and with no header or footer, which he liked.
 *
 * The page reads nothing from the request; the card does, behind a boundary,
 * so the shell prerenders.
 */

async function Card({ searchParams }: PageProps<"/[locale]/login">) {
  const params = await searchParams;
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const error = one(params.error);

  return (
    <SignInCard
      next={safeNext(one(params.next))}
      switched={one(params.switched) === "1"}
      initialError={error === "google" ? ("google" satisfies SignInError) : null}
    />
  );
}

export default async function LoginPage(props: PageProps<"/[locale]/login">) {
  const t = await getTranslations("auth");
  const points = t.raw("aside.points") as string[];

  return (
    <main className="flex flex-1 flex-col">
      <div className="px-6 pt-6 lg:px-10 lg:pt-8">
        <BrandLink label={t("home")} />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <section className="mx-auto w-full max-w-[400px]">
          <div className="bg-surface-secondary shadow-raised rounded-3xl border border-black/[0.06] p-6 sm:p-8 dark:border-white/[0.06]">
            <Suspense fallback={<div className="min-h-[420px]" aria-busy />}>
              <Card {...props} />
            </Suspense>
          </div>
        </section>

        <aside className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center lg:text-left">
          {/* The landing's cards are placed against a square of this size;
              any smaller and they spill over the sign-in card. */}
          <div className="relative hidden aspect-square w-full max-w-[360px] items-center justify-center lg:flex">
            <NervousActivity />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="bg-surface-secondary border-border shadow-raised relative z-10 h-[50%] w-[50%] rounded-full border object-cover p-1.5"
            />
          </div>
          <div className="flex w-full flex-col gap-5">
            <h2 className="font-heading text-foreground text-[22px] leading-[1.25] font-semibold tracking-[-0.02em]">
              {t("aside.title")}
            </h2>
            <ul className="flex flex-col gap-3 text-left">
              {points.map((point) => (
                <li
                  key={point}
                  className="text-text-secondary flex items-start gap-3 text-[15px] leading-normal"
                >
                  <span className="bg-surface-tertiary text-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
