import { getTranslations } from "next-intl/server";

import { BrandLink } from "@/components/auth/brand-link";
import { VerifyLink } from "@/components/auth/verify-link";

/** Where the link in the sign-in mail lands. The work is in `VerifyLink`. */
export default async function VerifyPage() {
  const t = await getTranslations("auth");

  return (
    <main className="flex flex-1 flex-col">
      <div className="px-6 pt-6 lg:px-10 lg:pt-8">
        <BrandLink label={t("home")} />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <section className="bg-surface-secondary shadow-raised w-full max-w-[400px] rounded-3xl border border-black/[0.06] p-6 sm:p-8 dark:border-white/[0.06]">
          <VerifyLink />
        </section>
      </div>
    </main>
  );
}
