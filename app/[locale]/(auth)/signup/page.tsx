import { redirect } from "@/lib/i18n/navigation";

/**
 * There is no separate sign-up: the first sign-in creates the account. The
 * address exists because people type it, and it should land on the one screen.
 */
export default async function SignupPage({
  params,
}: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
