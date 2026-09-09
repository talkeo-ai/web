"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";

import type { OpenedInterview } from "@/app/[locale]/(app)/onboarding/actions";
import { MarkTargets, useFireMark } from "@/components/talkeo/mark-target";
import { Button } from "@/components/ui/button";
import { useFollowingScroll } from "@/lib/onboarding/use-following-scroll";
import { useInterview } from "@/lib/onboarding/use-interview";
import { heardSoFar } from "@/lib/onboarding/conversation";
import { VIEW_SWITCH_MS } from "@/lib/onboarding/motion";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

import { Composer } from "./composer";
import { ExitDialog } from "./exit-dialog";
import { FocusView } from "./focus-view";
import { MicNotice } from "./mic-notice";
import { ProgressBar } from "./progress-bar";
import { Surface } from "./surface";
import { Transcript } from "./transcript";
import { ViewToggle } from "./view-toggle";

/**
 * The whole onboarding: one screen with two views of the same conversation.
 *
 * It draws and nothing more. What the conversation means, which view is up, when
 * a surface pulls somebody over and what is waiting to be sent are all decided
 * in `lib/onboarding/`, by functions that never render anything — which is what
 * makes any of it testable and what stops this file becoming the one that does
 * five jobs.
 */
export function OnboardingScreen({ opened }: { opened: OpenedInterview }) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  // Inside `MarkTargets` and not above it: the conversation drives playback, and
  // playback is what fires marks — so the hook that owns it has to be able to
  // reach the registry.
  return (
    <MarkTargets>
      <Screen opened={opened} t={t} onLeave={() => router.push("/")} />
    </MarkTargets>
  );
}

function Screen({
  opened,
  t,
  onLeave,
}: {
  opened: OpenedInterview;
  t: ReturnType<typeof useTranslations<"onboarding">>;
  onLeave: () => void;
}) {
  const fire = useFireMark();
  const scroll = useFollowingScroll();
  const run = useInterview(opened, { onMark: fire });
  const { conversation, view, surface, surfaceReady, live, playback } = run;

  const heard = heardSoFar(conversation.transcript);
  const showing = surface && surfaceReady ? surface : null;
  const inChat = view.view === "chat";

  return (
    <div
      data-slot="onboarding"
      data-view={view.view}
      className="flex h-dvh flex-col"
    >
      {/* The bar, the way out and the mute are one piece and travel together,
          held to the same column as the conversation and the field below it.
          Full-bleed, the bar ran the width of the window while everything it
          was about sat in the middle of it. */}
      <header className="w-full px-4 pt-4 pb-2">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <ExitDialog
          title={t("exit.title")}
          body={t("exit.body")}
          stay={t("exit.stay")}
          confirm={t("exit.confirm")}
          onLeave={onLeave}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("exit.leave")}
              data-slot="onboarding-exit"
              className="size-9 shrink-0 p-0"
            >
              <X className="size-5" />
            </Button>
          }
        />
        <ProgressBar
          stage={conversation.stage}
          total={conversation.stagesTotal}
          label={t("progress", {
            position: conversation.stage,
            total: conversation.stagesTotal,
          })}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={run.toggleVoice}
          aria-label={run.voiceOn ? t("voice.mute") : t("voice.unmute")}
          data-slot="onboarding-voice"
          data-on={run.voiceOn ? "true" : "false"}
          className="size-9 shrink-0 p-0"
        >
          {run.voiceOn ? (
            <Volume2 className="size-5" />
          ) : (
            <VolumeX className="size-5" />
          )}
        </Button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col">
        {/* The two views cross-fade in place rather than sliding: one of them is
            a column of text somebody is reading, and moving it under them is
            the part that reads as the screen deciding for them. */}
        <div
          className="flex min-h-0 flex-1 flex-col transition-opacity ease-(--ease-standard)"
          style={{ transitionDuration: `${VIEW_SWITCH_MS}ms` }}
          key={view.view}
        >
          {inChat ? (
            <Transcript
              said={conversation.thread}
              live={live}
              playback={playback}
              heard={heard}
              viewport={scroll.viewport}
              column={scroll.column}
              scrolled={scroll.scrolled}
            />
          ) : (
            <FocusView
              playback={playback}
              surface={
                showing ? (
                  <Surface
                    surface={showing}
                    refusal={run.micRefusal}
                    onTouch={run.touchSurface}
                    onAnswer={run.answerSurface}
                  />
                ) : null
              }
            />
          )}
        </div>

        {/* Floating, and only as wide as its label: the version that spanned the
            column cut the conversation in half with a band that was not part of
            it. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 flex justify-center",
            inChat ? "bottom-2" : "bottom-4",
          )}
        >
          <div className="pointer-events-auto">
            <ViewToggle
              view={view.view}
              unseen={view.unseen}
              label={inChat ? t("chat.hideChat") : t("chat.showChat")}
              updatedLabel={t("chat.updated")}
              onSwitch={run.switchView}
            />
          </div>
        </div>
      </main>

      {/* The field is always there in the chat, whichever way they chose to
          answer. What changes is only whether the call opens by itself. */}
      {inChat ? (
        <div className="w-full px-4 pt-8 pb-4">
          <div className="mx-auto w-full max-w-3xl">
            {run.micRefusal ? (
              <MicNotice refusal={run.micRefusal} className="mb-2" />
            ) : null}
            <Composer
              placeholder={
                conversation.name
                  ? t("chat.placeholderNamed", { name: conversation.name })
                  : t("chat.placeholder")
              }
              inCall={run.inCall}
              muted={run.micMuted}
              canSend={!conversation.answering}
              onSend={(text) => {
                scroll.follow();
                run.say(text);
              }}
              onCall={run.startCall}
              onHangUp={run.hangUp}
              onMute={run.toggleMic}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
