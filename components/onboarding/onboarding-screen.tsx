"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";

import type { OpenedInterview } from "@/app/[locale]/(app)/onboarding/actions";
import { MarkTargets, useFireMark } from "@/components/talkeo/mark-target";
import { Button } from "@/components/ui/button";
import { useFollowingScroll } from "@/lib/onboarding/use-following-scroll";
import { surfaceKey } from "@/lib/onboarding/machine";
import { useInterview } from "@/lib/onboarding/use-interview";
import { heardSoFar } from "@/lib/onboarding/conversation";
import { useRouter } from "@/lib/i18n/navigation";

import { Composer } from "./composer";
import { ExitDialog } from "./exit-dialog";
import { MicNotice } from "./mic-notice";
import { ProgressBar } from "./progress-bar";
import { Surface } from "./surface";
import { Transcript } from "./transcript";

/**
 * The whole onboarding: one conversation, with its surfaces in the thread.
 *
 * It draws and nothing more. What the conversation means, which surface is up
 * and what is waiting to be sent are all decided
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
  const { conversation, surface, anchored, live, playback } = run;

  const heard = heardSoFar(conversation.transcript);
  const currentKey = surface ? surfaceKey(surface) : null;

  return (
    <div data-slot="onboarding" className="flex h-dvh flex-col">
      {/* The bar, the way out and the mute are one piece and travel together,
          held to the same column as the conversation and the field below it.
          Full-bleed, the bar ran the width of the window while everything it
          was about sat in the middle of it. */}
      <header className="w-full px-4 pt-2 pb-0">
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
        <Transcript
          said={conversation.thread}
          live={live}
          playback={playback}
          heard={heard}
          surfaces={anchored.map((entry) => {
            // Only the one for where the conversation is can be answered: an
            // answer goes to the current stage, so a card left behind is a
            // record of what was said, and `inert` keeps it one.
            const current = currentKey === entry.key;
            return {
              key: entry.key,
              after: entry.after,
              node: (
                <div inert={!current}>
                  <Surface
                    surface={entry.surface}
                    refusal={current ? run.micRefusal : ""}
                    pending={
                      current &&
                      run.outbox.pending.some(
                        (edit) => edit.card === entry.surface.card,
                      )
                    }
                    onAnswer={run.answerSurface}
                  />
                </div>
              ),
            };
          })}
          viewport={scroll.viewport}
          column={scroll.column}
          scrolled={scroll.scrolled}
        />
      </main>

      {/* The field is always there, whichever way they chose to answer. What
          changes is only whether the call opens by itself. */}
      <div className="w-full px-4 pt-2 pb-4">
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
            canCall={Boolean(conversation.name)}
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
    </div>
  );
}
