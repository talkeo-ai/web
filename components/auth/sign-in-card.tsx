"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { ErrorCode } from "@/core/contracts";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import {
  readAccount,
  sendCode,
  startGoogle,
  verifyCode,
} from "@/lib/session/actions";
import { ensureSession, forgetSession } from "@/lib/session/ensure-session";

import { Presence } from "./presence";
import { Swap } from "./swap";

type Step = "email" | "code" | "switched";
type Busy = "google" | "send" | "verify" | null;
/** The lines this card can show: the service's codes it has copy for, plus two of its own. */
export type SignInError =
  | Extract<
      ErrorCode,
      | "CODE_INVALID"
      | "RATE_LIMITED"
      | "EMAIL_REJECTED"
      | "CHALLENGE_FAILED"
      | "OAUTH_FAILED"
    >
  | "google"
  | "generic";

const SHOWN: readonly string[] = [
  "CODE_INVALID",
  "RATE_LIMITED",
  "EMAIL_REJECTED",
  "CHALLENGE_FAILED",
  "OAUTH_FAILED",
];

function lineFor(code: ErrorCode): SignInError {
  return SHOWN.includes(code) ? (code as SignInError) : "generic";
}

/** Seconds before another code can be asked for: the mail usually lands well inside it. */
const RESEND_AFTER = 30;
const CODE_LENGTH = 6;

/**
 * Signing in and signing up, as one card: Google, or an email and the code it
 * receives. There is no separate sign-up, because there is nothing different to
 * ask: the service creates the account the first time an email signs in, on the
 * same user the visitor already was.
 *
 * The code step replaces the email step in place, so the whole thing is one
 * screen. Six digits typed (or pasted) sign in without a press.
 *
 * Every call needs a session, the sign-in ones too, so the card makes sure the
 * browser has one as soon as it mounts; by the time anything is pressed it is
 * usually there.
 */
export function SignInCard({
  next,
  switched = false,
  initialError = null,
  onSignedIn,
}: {
  next: string;
  switched?: boolean;
  initialError?: SignInError | null;
  /** Instead of navigating to `next`, e.g. when the card sits in a dialog. */
  onSignedIn?: () => void;
}) {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [step, setStep] = useState<Step>(switched ? "switched" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<SignInError | null>(initialError);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const verifying = useRef(false);

  function done() {
    if (onSignedIn) return onSignedIn();
    router.replace(next);
    router.refresh();
  }

  useEffect(() => {
    void ensureSession();
    if (switched || onSignedIn) return;
    // Somebody already signed in has nothing to do here.
    void readAccount().then((account) => {
      if (account?.registered) router.replace(next);
    });
  }, [switched, onSignedIn, next, router]);

  // The countdown only ticks while there is one.
  useEffect(() => {
    if (step !== "code" || now >= resendAt) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [step, now, resendAt]);

  /** Runs `call` with a session, starting one again if the service says the old one is over. */
  async function withSession<T extends { ok: boolean }>(
    call: () => Promise<T | { ok: false; code: ErrorCode }>,
  ): Promise<T | { ok: false; code: ErrorCode }> {
    const failed = await ensureSession();
    if (failed) return { ok: false, code: failed };
    const result = await call();
    if (!result.ok && "code" in result && result.code === "UNAUTHENTICATED") {
      forgetSession();
      const again = await ensureSession();
      if (again) return { ok: false, code: again };
      return call();
    }
    return result;
  }

  async function google() {
    setError(null);
    setBusy("google");
    const started = await withSession(() => startGoogle(next));
    if (started.ok && "url" in started) {
      window.location.assign(started.url);
      return;
    }
    setBusy(null);
    setError(started.ok ? "generic" : lineFor(started.code));
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setBusy("send");
    const sent = await withSession(() => sendCode(email, locale));
    setBusy(null);
    if (!sent.ok) return setError(lineFor(sent.code));
    setCode("");
    setResendAt(Date.now() + RESEND_AFTER * 1000);
    setNow(Date.now());
    setStep("code");
  }

  async function verify(value: string) {
    // Typing the sixth digit and pressing the button would otherwise send it twice.
    if (verifying.current || value.length !== CODE_LENGTH) return;
    verifying.current = true;
    setError(null);
    setBusy("verify");
    const signed = await withSession(() => verifyCode(email, value));
    verifying.current = false;
    setBusy(null);
    if (!signed.ok) return setError(lineFor(signed.code));
    if ("switched" in signed && signed.switched) return setStep("switched");
    done();
  }

  const waitFor = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <div className="flex w-full flex-col gap-6">
      <Swap
        step={step}
        render={(shown) => {
          if (shown === "switched") {
            return (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h1 className="font-heading text-foreground text-[26px] leading-[1.2] font-semibold tracking-[-0.02em]">
                    {t("switchedTitle")}
                  </h1>
                  <p className="text-text-secondary text-[15px] leading-normal">
                    {t("switchedBody")}
                  </p>
                </div>
                <Button size="lg" className="w-full" onClick={done}>
                  {t("continue")}
                </Button>
              </div>
            );
          }

          if (shown === "code") {
            return (
              <form
                className="flex flex-col gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verify(code);
                }}
              >
                <div className="flex flex-col gap-2">
                  <h1 className="font-heading text-foreground text-[26px] leading-[1.2] font-semibold tracking-[-0.02em]">
                    {t("codeTitle")}
                  </h1>
                  <p className="text-text-secondary text-[15px] leading-normal">
                    {t.rich("codeBody", {
                      address: email.trim(),
                      email: (chunks) => (
                        <span className="text-foreground font-medium break-all">
                          {chunks}
                        </span>
                      ),
                    })}
                  </p>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-text-secondary text-[13px] font-medium">
                    {t("codeLabel")}
                  </span>
                  <Input
                    autoFocus
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={CODE_LENGTH}
                    value={code}
                    disabled={busy === "verify"}
                    onChange={(event) => {
                      const digits = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, CODE_LENGTH);
                      setCode(digits);
                      if (digits.length === CODE_LENGTH) void verify(digits);
                    }}
                    className="text-center text-[22px] tracking-[0.5em] tabular-nums"
                  />
                </label>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={busy !== null || code.length !== CODE_LENGTH}
                >
                  {busy === "verify" && <Loader2 className="animate-spin" />}
                  {t("verify")}
                </Button>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-text-secondary rounded-lg px-3"
                    onClick={() => {
                      setError(null);
                      setStep("email");
                    }}
                  >
                    {t("otherEmail")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-text-secondary rounded-lg px-3 tabular-nums"
                    disabled={waitFor > 0 || busy !== null}
                    onClick={() => void send()}
                  >
                    {waitFor > 0
                      ? t("resendIn", { seconds: waitFor })
                      : t("resend")}
                  </Button>
                </div>
              </form>
            );
          }

          return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-foreground text-[26px] leading-[1.2] font-semibold tracking-[-0.02em]">
                  {t("title")}
                </h1>
                <p className="text-text-secondary text-[15px] leading-normal">
                  {t("subtitle")}
                </p>
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={busy !== null}
                onClick={() => void google()}
              >
                {busy === "google" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <GoogleIcon className="size-[18px]" />
                )}
                {t("google")}
              </Button>

              <div className="flex items-center gap-4" aria-hidden>
                <span className="bg-separator h-px flex-1" />
                <span className="text-text-tertiary text-[13px]">
                  {t("or")}
                </span>
                <span className="bg-separator h-px flex-1" />
              </div>

              <form className="flex flex-col gap-3" onSubmit={send}>
                <label className="flex flex-col gap-2">
                  <span className="text-text-secondary text-[13px] font-medium">
                    {t("emailLabel")}
                  </span>
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    disabled={busy !== null}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <Button
                  type="submit"
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  disabled={busy !== null || !email.trim()}
                >
                  {busy === "send" && <Loader2 className="animate-spin" />}
                  {t("sendCode")}
                </Button>
                <p className="text-text-tertiary text-[13px] leading-normal">
                  {t("emailHint")}
                </p>
              </form>
            </div>
          );
        }}
      />

      <Presence show={error !== null}>
        <p role="alert" className="text-destructive text-[14px] leading-normal">
          {error && t(`errors.${error}`)}
        </p>
      </Presence>

      <p className="text-text-tertiary text-[12px] leading-normal">
        {t.rich("legal", {
          terms: (chunks) => (
            <Link
              href="/terms"
              prefetch={false}
              className="hover:text-foreground underline underline-offset-2"
            >
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link
              href="/privacy"
              prefetch={false}
              className="hover:text-foreground underline underline-offset-2"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
