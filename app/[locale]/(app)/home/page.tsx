import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/lib/session/current-user";

/**
 * Placeholder, and the reference shape for every page under `(app)`.
 *
 * The page itself reads nothing request-dependent, so its shell prerenders.
 * Anything that depends on the visitor is read inside a child behind a
 * `<Suspense>` boundary, whose fallback travels in that shell. `next build`
 * should report this route as a Partial Prerender.
 */

async function SessionState() {
  const t = await getTranslations("home");
  const user = await getCurrentUser();

  return (
    <p className="text-muted-foreground text-sm">
      {user ? t("sessionReady") : t("sessionMissing")}
    </p>
  );
}

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <p className="text-sm">{t("placeholder")}</p>
      <Suspense
        fallback={
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        }
      >
        <SessionState />
      </Suspense>
    </main>
  );
}
