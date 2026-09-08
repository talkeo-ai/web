import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex flex-1 flex-col">
      {/* Header compensator — the floating header is out of the flow, so the
          space it covers is reserved here, same as the landing does. */}
      <div className="h-28 shrink-0 lg:h-20" aria-hidden />

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <p className="text-text-tertiary font-mono text-[13px] tracking-[0.8px] uppercase">
            404
          </p>
          <h1 className="text-foreground font-heading mt-3 text-[28px] leading-[1.3] font-semibold tracking-[-0.02em]">
            {t("title")}
          </h1>
        </div>
        <Button size="lg" asChild>
          <Link href="/" prefetch={false}>
            {t("cta")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
