"use client";

import { useLocale } from "next-intl";
import { useState } from "react";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { Segmented } from "./segmented";
import { ARRIVE, CARD, arrive, type T } from "./ui";

const MINUTES = ["5", "10", "15", "20", "30"] as const;
const LOCALES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
] as const;

/**
 * Settings, as a few short groups of rows. The minutes per day is the dose
 * target the Core already takes (`set_dose_target`); the rest is local to
 * this screen until there is an account to keep it on.
 */
export function Settings({
  home,
  t,
  autoOpen,
  onAutoOpen,
}: {
  home: Home;
  t: T;
  autoOpen: boolean;
  onAutoOpen: (on: boolean) => void;
}) {
  const [minutes, setMinutes] = useState<string>(String(home.dose.target_session_minutes));
  const [reminder, setReminder] = useState(true);
  const [voice, setVoice] = useState(true);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 pb-6">
      <h1
        className={cn("font-heading text-foreground text-[30px] leading-[1.05] font-medium tracking-[-0.035em] lg:text-[40px]", ARRIVE)}
        style={arrive(0)}
      >
        {t("settings.title")}
      </h1>

      <Group title={t("settings.profile")} order={1}>
        <Row label={t("settings.name")}>
          <span className="text-foreground text-[15px]">{home.name}</span>
        </Row>
        <Row label={t("settings.email")}>
          <span className="text-text-tertiary mr-2 text-[14px]">{t("settings.emailEmpty")}</span>
          <Link
            href="/login"
            prefetch={false}
            className="font-heading inline-flex h-8 items-center rounded-full bg-[var(--brand)] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--brand-hover)]"
          >
            {t("save.cta")}
          </Link>
        </Row>
      </Group>

      <Group title={t("settings.practice")} order={2}>
        <Row label={t("settings.daily")} stack>
          <Segmented
            size="sm"
            value={minutes as (typeof MINUTES)[number]}
            onChange={setMinutes}
            options={MINUTES.map((m) => ({ value: m, label: m }))}
          />
        </Row>
        <Row label={t("settings.reminder")}>
          <Switch on={reminder} onChange={setReminder} label={t("settings.reminder")} />
        </Row>
      </Group>

      <Group title={t("settings.talkeo")} order={3}>
        <Row label={t("settings.voice")}>
          <Switch on={voice} onChange={setVoice} label={t("settings.voice")} />
        </Row>
        <Row label={t("settings.autoOpen")}>
          <Switch on={autoOpen} onChange={onAutoOpen} label={t("settings.autoOpen")} />
        </Row>
        <Row label={t("settings.language")} stack>
          <Segmented
            size="sm"
            value={locale as (typeof LOCALES)[number]["value"]}
            onChange={(next) => router.replace(pathname, { locale: next })}
            options={LOCALES.map((l) => ({ value: l.value, label: l.label }))}
          />
        </Row>
      </Group>

      <Group title={t("settings.account")} order={4}>
        <button type="button" className="text-foreground hover:bg-surface-secondary/60 flex h-12 w-full cursor-pointer items-center px-5 text-left text-[15px] transition-colors">
          {t("settings.signOut")}
        </button>
        <button type="button" className="text-destructive hover:bg-destructive/5 flex h-12 w-full cursor-pointer items-center px-5 text-left text-[15px] transition-colors">
          {t("settings.deleteData")}
        </button>
      </Group>
    </div>
  );
}

function Group({ title, order, children }: { title: string; order: number; children: React.ReactNode }) {
  return (
    <section className={ARRIVE} style={arrive(order)}>
      <h2 className="text-text-secondary mb-2 px-2 text-[13px] font-medium">{title}</h2>
      <div className={cn(CARD, "divide-y divide-black/[0.05] overflow-hidden dark:divide-white/[0.06]")}>{children}</div>
    </section>
  );
}

function Row({ label, stack = false, children }: { label: string; stack?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-14 px-5 py-3",
        stack ? "flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between" : "items-center justify-between gap-4",
      )}
    >
      <span className="text-foreground text-[15px]">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-(--ease-standard)",
        on ? "bg-[var(--brand)]" : "bg-surface-tertiary",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.2)]",
          "transition-transform duration-[380ms] ease-(--ease-entrance)",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}
