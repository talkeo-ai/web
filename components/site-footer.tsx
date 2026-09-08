import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { LOCALE_LABELS } from "@/lib/i18n/locales";
import { routing } from "@/lib/i18n/routing";

/**
 * The year is a constant, not `new Date()`.
 *
 * Reading the clock while rendering makes the output non-deterministic, which
 * costs this route its static shell — a copyright line is not worth turning
 * the whole page dynamic for.
 */
const YEAR = 2026;

/**
 * Sits on its own surface rather than on the page background, so the columns
 * read as a block that closes the page instead of as more page.
 *
 * Every entry points somewhere that exists. Padding a footer with headings for
 * pages that were never built is the fastest way to make a product look larger
 * than it is and emptier than it is at the same time.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const actions = await getTranslations("hero");

  return (
    <footer className="bg-surface-secondary border-separator border-t">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <div className="text-foreground font-heading flex items-center gap-2 text-lg font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                className="size-7 rounded-full"
                aria-hidden
              />
              Talkeo
            </div>
            <p className="text-text-secondary mt-3 text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <FooterColumn title={t("product")}>
            <FooterLink href="/onboarding">{actions("cta")}</FooterLink>
            <FooterLink href="/login">{actions("signIn")}</FooterLink>
          </FooterColumn>

          <FooterColumn title={t("legal")}>
            <FooterLink href="/terms">{t("terms")}</FooterLink>
            <FooterLink href="/privacy">{t("privacy")}</FooterLink>
            <FooterLink href="/refunds">{t("refunds")}</FooterLink>
          </FooterColumn>

          <FooterColumn title={t("help")}>
            <FooterAnchor href="mailto:founders@talkeo.ai">
              {t("contact")}
            </FooterAnchor>
          </FooterColumn>
        </div>

        {/* Languages as a plain row of links, not a menu: down here there is
            room to show every option at once, and a list you can read beats a
            control you have to open. */}
        <div className="border-separator mt-12 border-t pt-8">
          <h2 className="text-foreground font-heading text-sm font-semibold">
            {t("language")}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
            {routing.locales.map((code) => (
              <li key={code}>
                <Link
                  href="/"
                  locale={code}
                  className="text-text-secondary hover:text-foreground text-sm transition-colors duration-(--duration-control) ease-(--ease-standard)"
                >
                  {LOCALE_LABELS[code].native}
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-text-tertiary mt-10 text-[13px]">
            {t("rights", { year: YEAR })}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-foreground font-heading text-sm font-semibold">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col gap-3">{children}</ul>
    </div>
  );
}

const linkStyles =
  "text-text-secondary hover:text-foreground w-fit text-sm transition-colors duration-(--duration-control) ease-(--ease-standard)";

function FooterLink({
  href,
  children,
}: {
  href: "/onboarding" | "/login" | "/terms" | "/privacy" | "/refunds";
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className={linkStyles}>
        {children}
      </Link>
    </li>
  );
}

function FooterAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a href={href} className={linkStyles}>
        {children}
      </a>
    </li>
  );
}
