import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { BrandLink } from "@/components/auth/brand-link";
import { SignInCard, type SignInError } from "@/components/auth/sign-in-card";
import { safeNext } from "@/lib/session/next-path";

/**
 * One screen to sign in and to sign up: the card and nothing else, as on the
 * old Talkeo. A version with a second column (the landing's mark and what an
 * account is for) was too much for Joaquin (28/oct: "esto fue DEMASIADO").
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

  return (
    <main className="flex flex-1 flex-col">
      <div className="px-6 pt-6 lg:px-10 lg:pt-8">
        <BrandLink label={t("home")} />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <section className="bg-surface-secondary shadow-raised w-full max-w-[400px] rounded-3xl border border-black/[0.06] p-6 sm:p-8 dark:border-white/[0.06]">
          <Suspense fallback={<div className="min-h-[420px]" aria-busy />}>
            <Card {...props} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
