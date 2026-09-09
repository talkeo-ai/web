"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Volume2, VolumeX } from "lucide-react";

import type { OpenedInterview } from "@/app/[locale]/(app)/onboarding/actions";
import { MarkTargets, useFireMark } from "@/components/talkeo/mark-target";
import { Button } from "@/components/ui/button";
import type { TalkeoTurn } from "@/core/contracts";
import { voice } from "@/lib/audio/voice";
import { useFollowingScroll } from "@/lib/onboarding/use-following-scroll";
import { useInterview } from "@/lib/onboarding/use-interview";
import { heardSoFar } from "@/lib/onboarding/conversation";
import { VIEW_SWITCH_MS } from "@/lib/onboarding/motion";
import { useRouter } from "@/lib/i18n/navigation";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";
import { cn } from "@/lib/utils";

import { Composer } from "./composer";
import { ExitDialog } from "./exit-dialog";
import { FocusView } from "./focus-view";
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
  const run = useInterview(opened);

  return (
    <MarkTargets>
      <Screen run={run} t={t} onLeave={() => router.push("/")} />
    </MarkTargets>
  );
}

type Run = ReturnType<typeof useInterview>;

function Screen({
  run,
  t,
  onLeave,
}: {
  run: Run;
  t: ReturnType<typeof useTranslations<"onboarding">>;
  onLeave: () => void;
}) {
  const fire = useFireMark();
  const scroll = useFollowingScroll();
  const { conversation, view, surface, surfaceReady } = run;

  // The turn being said, in the shape playback reads. Rebuilt as it grows: the
  // service streams it, so the text is longer every few frames.
  const live: TalkeoTurn | null = useMemo(
    () =>
      conversation.turn
        ? {
            turn_id: conversation.turn.id,
            text: conversation.turn.text,
            marks: [],
            word_timings: conversation.turn.timings,
            audio: null,
            events: [],
            closing: false,
          }
        : null,
    [conversation.turn],
  );

  const playback = useTurnPlayback(live ?? lastSaid(run), {
    onMark: fire,
    playhead: voice(),
  });

  const heard = heardSoFar(conversation.transcript);
  const showing = surface && surfaceReady ? surface : null;
  const inChat = view.view === "chat";

  return (
    <div
      data-slot="onboarding"
      data-view={view.view}
      className="flex h-dvh flex-col"
    >
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
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
              shows={view.shows}
              playback={playback}
              surface={
                showing ? (
                  <Surface
                    surface={showing}
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
            {run.micTrouble ? (
              <p className="text-text-secondary mb-2 text-sm">
                {t("voice.noMic")}
              </p>
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

/**
 * The last thing Talkeo said, for focus to show between turns.
 *
 * Focus shows one turn, so between turns it shows the one before — otherwise the
 * screen empties every time somebody answers, which reads as the conversation
 * having ended.
 */
function lastSaid(run: Run): TalkeoTurn | null {
  const said = [...run.conversation.thread]
    .reverse()
    .find((entry) => entry.from === "talkeo");
  if (!said) return null;
  return {
    turn_id: said.id,
    text: said.text,
    marks: said.marks ?? [],
    word_timings: said.timings ?? [],
    audio: null,
    events: [],
    closing: false,
  };
}
