"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  MarkTargets,
  useFireMark,
  useMarkTarget,
  useResetMarks,
} from "@/components/talkeo/mark-target";
import { TurnText } from "@/components/talkeo/turn-text";
import { Button } from "@/components/ui/button";
import type { Step, TalkeoTurn } from "@/core/contracts";
import { useRouter } from "@/lib/i18n/navigation";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";
import { unlockVoice, voiceElement } from "@/lib/talkeo/voice";
import { cn } from "@/lib/utils";

type NextTurn = () => Promise<{ turn: TalkeoTurn; step: Step } | null>;

/**
 * Scaffolding, and drawn like it.
 *
 * It plays the assistant's turns and shows the marks landing, which is what
 * proves the machinery under it works against the real adapter. What it is
 * not is the screen: there is no composer, no voice, and no layout worth
 * keeping. Replacing this file is the next piece of work, and none of
 * `lib/talkeo/` or `components/talkeo/` has to move for that.
 */
export function TalkeoScreen({ next }: { next: NextTurn }) {
  return (
    <MarkTargets>
      <TalkeoScaffold next={next} />
    </MarkTargets>
  );
}

function TalkeoScaffold({ next }: { next: NextTurn }) {
  const t = useTranslations("onboarding.talkeo");
  const router = useRouter();

  const [turn, setTurn] = useState<TalkeoTurn | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [pending, startTransition] = useTransition();

  const fireMark = useFireMark();
  const resetMarks = useResetMarks();
  // One element for the whole run, so the press on the door is what lets every
  // turn after it be heard.
  const [voice] = useState(voiceElement);
  const { lines, revealedLines, done } = useTurnPlayback(turn, {
    onMark: fireMark,
    voice,
  });

  // The run has left this step, so the answer is wherever it went: the page's
  // own guard knows, and a refresh is what asks it.
  const leaving = step !== null && step !== "talkeo_interview";

  const advance = () => {
    // Every press is another chance to claim playback, for the visitor who
    // reloaded onto this screen and never pressed the door.
    unlockVoice();

    if (leaving) {
      router.refresh();
      return;
    }
    startTransition(async () => {
      resetMarks();
      const result = await next();
      if (!result) {
        router.refresh();
        return;
      }
      setTurn(result.turn);
      setStep(result.step);
    });
  };

  // The assistant talks first, so the opening turn is fetched rather than
  // waited for. The ref is what keeps development's double mount to one turn.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targets = [...new Set((turn?.marks ?? []).map((mark) => mark.target))];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-text-tertiary font-mono text-[11px] tracking-[0.6px] uppercase">
        {t("scaffold")}
      </p>

      <TurnText
        lines={lines}
        revealedLines={revealedLines}
        className="text-foreground text-lg leading-relaxed"
      />

      {targets.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-text-tertiary text-xs">{t("marks")}</p>
          <ul className="flex flex-wrap gap-2">
            {targets.map((target) => (
              <MarkChip key={target} target={target} />
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <Button size="sm" onClick={advance} disabled={pending || !done}>
          {leaving ? t("go") : t("next")}
        </Button>
      </div>
    </div>
  );
}

/** Lights when the voice reaches the word this target is pinned to. */
function MarkChip({ target }: { target: string }) {
  const fired = useMarkTarget(target);

  return (
    <li
      data-slot="mark-chip"
      data-fired={fired ? "true" : "false"}
      data-target={target}
      className={cn(
        "rounded-lg border px-2.5 py-1 font-mono text-[11px]",
        "transition-colors duration-(--duration-control) ease-(--ease-standard)",
        fired
          ? "border-accent-500 text-accent-text bg-surface-secondary"
          : "border-separator text-text-tertiary",
      )}
    >
      {target}
      {fired ? ` · ${fired.action}` : null}
    </li>
  );
}
