"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { readAccount, verifyCode } from "@/lib/session/actions";
import { readFragment } from "@/lib/session/link-fragment";
import { AFTER_SIGN_IN } from "@/lib/session/next-path";

import { Swap } from "./swap";

type Shown = "working" | "otherBrowser" | "invalid";

/**
 * The link in the mail. The address and the code ride in the fragment, which
 * no server ever receives, and the code only works for the session that asked
 * for it, so a link opened in another browser cannot sign in: it says so and
 * points back to typing the code where it was asked for.
 *
 * A mail client that opens links twice (a preview, then the click) spends the
 * code on the first open. If the second open finds the code spent but this
 * browser already signed in, it goes on as if it had worked, because it did.
 */
export function VerifyLink() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [shown, setShown] = useState<Shown>("working");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const link = readFragment(window.location.hash);
    // The code should not sit in the address bar or the history once read.
    window.history.replaceState(null, "", window.location.pathname);

    void (async () => {
      if (!link) return setShown("invalid");
      const result = await verifyCode(link.email, link.code);
      if (result.ok) {
        router.replace(
          result.switched
            ? `/login?switched=1&next=${encodeURIComponent(AFTER_SIGN_IN)}`
            : AFTER_SIGN_IN,
        );
        return router.refresh();
      }
      if (result.code === "UNAUTHENTICATED") return setShown("otherBrowser");
      const account = await readAccount();
      if (account?.registered) {
        router.replace(AFTER_SIGN_IN);
        return router.refresh();
      }
      setShown("invalid");
    })();
  }, [router]);

  return (
    <Swap
      step={shown}
      render={(step) =>
        step === "working" ? (
          <div
            role="status"
            className="text-text-secondary flex items-center gap-3 text-[15px]"
          >
            <Loader2 className="size-5 animate-spin" />
            {t("verifyPage.working")}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p
              role="alert"
              className="text-foreground text-[17px] leading-normal font-medium"
            >
              {t(`verifyPage.${step}`)}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/login" prefetch={false}>
                {t("verifyPage.back")}
              </Link>
            </Button>
          </div>
        )
      }
    />
  );
}
