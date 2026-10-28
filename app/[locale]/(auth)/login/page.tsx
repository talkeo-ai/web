import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInCard, type SignInError } from "@/components/auth/sign-in-card";
import { safeNext } from "@/lib/session/next-path";

/**
 * One screen to sign in and to sign up, modelled on the old Talkeo's: the name,
 * a line, Google, the email. Two earlier versions here (two columns, then a
 * card under a header) were more than Joaquin wanted (28/oct).
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
      initialError={
        error === "google" ? ("google" satisfies SignInError) : null
      }
    />
  );
}

export default function LoginPage(props: PageProps<"/[locale]/login">) {
  return (
    <AuthShell>
      <Suspense fallback={<div className="min-h-[360px]" aria-busy />}>
        <Card {...props} />
      </Suspense>
    </AuthShell>
  );
}
