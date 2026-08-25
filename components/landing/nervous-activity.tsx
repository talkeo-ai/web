"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

import { prefersReducedMotion } from "@/lib/motion";

type ActivityDef = { action: string; text: string };

function getActivities(
  t: (key: string) => string,
  mobile = false,
): ActivityDef[] {
  if (mobile) {
    // Shorter texts only for mobile
    return [
      { action: t("levelDetected"), text: t("levelValue") },
      { action: t("memorySaved"), text: t("memoryWork") },
      { action: t("goalRegistered"), text: t("goal2") },
      { action: t("progressUpdated"), text: t("progressValue") },
    ];
  }
  return [
    { action: t("levelDetected"), text: t("levelValue") },
    { action: t("memorySaved"), text: t("memoryWork") },
    { action: t("errorSaved"), text: t("error1") },
    { action: t("goalRegistered"), text: t("goal1") },
    { action: t("memorySaved"), text: t("memoryTravel") },
    { action: t("errorSaved"), text: t("error2") },
    { action: t("progressUpdated"), text: t("progressValue") },
    { action: t("memorySaved"), text: t("memoryLikes") },
    { action: t("errorSaved"), text: t("error3") },
    { action: t("goalRegistered"), text: t("goal2") },
  ];
}

const slotConfigs = [
  {
    linePath: "M 215,130 L 215,90 Q 215,75 200,75 L 170,75",
    maskPath: "M 215,130 L 215,90 Q 215,75 200,75 L 170,75",
    cardStyle: {
      top: "15%",
      left: "34%",
      transform: "translate(-100%, -50%)",
    } as React.CSSProperties,
  },
  {
    linePath: "M 285,370 L 285,410 Q 285,425 300,425 L 330,425",
    maskPath: "M 285,370 L 285,410 Q 285,425 300,425 L 330,425",
    cardStyle: {
      top: "85%",
      left: "66%",
      transform: "translate(0%, -50%)",
    } as React.CSSProperties,
  },
  {
    linePath: "M 285,130 L 285,90 Q 285,75 300,75 L 330,75",
    maskPath: "M 285,130 L 285,90 Q 285,75 300,75 L 330,75",
    cardStyle: {
      top: "15%",
      left: "66%",
      transform: "translate(0%, -50%)",
    } as React.CSSProperties,
  },
  {
    linePath: "M 215,370 L 215,410 Q 215,425 200,425 L 170,425",
    maskPath: "M 215,370 L 215,410 Q 215,425 200,425 L 170,425",
    cardStyle: {
      top: "85%",
      left: "34%",
      transform: "translate(-100%, -50%)",
    } as React.CSSProperties,
  },
];

function TypewriterText({
  text,
  speed = 30,
}: {
  text: string;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    // Typing is motion driven by a timer, so the CSS rule cannot reach it:
    // with reduced motion the text is simply there.
    if (prefersReducedMotion()) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <>{displayed}</>;
}

type Phase = "line" | "typing" | "visible" | "fading";
type SlotState = {
  // The ActivityDef currently displayed in this slot.
  activity: ActivityDef;
  phase: Phase;
  // Per-animation id, so phase updates only apply to the run they were
  // scheduled for.
  runId: number;
} | null;

let globalRunId = 0;

/**
 * The cards that surface around the hero artwork, one after another.
 *
 * Takes no props: it renders the same illustrative loop everywhere it is used.
 */
export function NervousActivity() {
  const t = useTranslations("nervousActivity");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);
  const poolRef = useRef<ActivityDef[]>(getActivities(t, false));
  useEffect(() => {
    poolRef.current = getActivities(t, isMobile);
    // Reset the cycle cursor when the pool changes so we start clean.
    nextIndexRef.current = 0;
  }, [isMobile, t]);
  const [slots, setSlots] = useState<SlotState[]>([null, null, null, null]);
  const nextIndexRef = useRef(0);
  const nextSlotRef = useRef(0);
  // Every phase transition currently queued, so unmounting can cancel them.
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const update = (slotIdx: number, runId: number, phase: Phase) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[slotIdx]?.runId === runId)
        next[slotIdx] = { ...next[slotIdx]!, phase };
      return next;
    });
  };

  const clear = (slotIdx: number, runId: number) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[slotIdx]?.runId === runId) next[slotIdx] = null;
      return next;
    });
  };

  const animateActivity = useCallback((activity: ActivityDef) => {
    const slotIdx = nextSlotRef.current;
    const runId = ++globalRunId;

    // Line draws (0.5s)
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { activity, phase: "line", runId };
      return next;
    });

    // Phase timers are tracked so cleanup can cancel them. Without that they
    // outlive the component by up to five seconds, still calling `setSlots` on
    // a tree that is gone — and a re-run of the cycle effect leaves the
    // previous card's transitions running underneath the new one.
    const schedule = (fn: () => void, delay: number) => {
      phaseTimersRef.current.push(setTimeout(fn, delay));
    };

    schedule(() => update(slotIdx, runId, "typing"), 300);
    schedule(() => update(slotIdx, runId, "visible"), 2200);
    schedule(() => update(slotIdx, runId, "fading"), 4500);
    schedule(() => clear(slotIdx, runId), 5200);

    nextSlotRef.current = (slotIdx + 1) % slotConfigs.length;
  }, []);

  /** Advances the cursor and animates whatever it lands on. */
  const showNext = useCallback(() => {
    const pool = poolRef.current;
    if (pool.length === 0) return;

    const index = nextIndexRef.current;
    animateActivity(pool[index]);
    nextIndexRef.current = (index + 1) % pool.length;
  }, [animateActivity]);

  useEffect(() => {
    // Cards appearing and fading on a loop is decorative motion on a timer.
    // Nothing here conveys information the rest of the page does not, so with
    // reduced motion the cycle simply does not run.
    if (prefersReducedMotion()) return;

    // Slower on narrow screens, where fewer cards fit and they overlap sooner.
    const gap = isMobile ? 5500 : 3200;
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      showNext();
      timeoutId = setTimeout(tick, gap);
    };
    const initial = setTimeout(tick, isMobile ? 1200 : 800);

    const phaseTimers = phaseTimersRef.current;
    return () => {
      clearTimeout(initial);
      clearTimeout(timeoutId);
      // Cancels the transitions already queued for cards mid-flight.
      phaseTimers.forEach(clearTimeout);
      phaseTimers.length = 0;
    };
  }, [showNext, isMobile]);

  return (
    <>
      {/* Each slot renders its own absolutely positioned wrapper with BOTH line and card */}
      {slots.map((slot, i) => {
        if (!slot) return null;
        const config = slotConfigs[i];
        const activity = slot.activity;
        const isFading = slot.phase === "fading";
        const showCard =
          slot.phase === "typing" ||
          slot.phase === "visible" ||
          slot.phase === "fading";

        return (
          <div
            key={`slot-${slot.runId}`}
            className="contents"
            style={
              {
                // Wrapper doesn't render visually, just groups
              }
            }
          >
            {/* SVG line — behind the orb */}
            <div
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{
                opacity: isFading ? 0 : 1,
                transition: "opacity 0.7s ease-in-out",
              }}
            >
              <svg className="w-full h-full" viewBox="0 0 500 500" fill="none">
                <defs>
                  <mask
                    id={`mask-${slot.runId}`}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="500"
                    height="500"
                  >
                    <path
                      d={config.maskPath}
                      stroke="white"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset="1"
                      style={{
                        animation: "reveal-line 0.5s ease-out forwards",
                      }}
                    />
                  </mask>
                </defs>
                <path
                  d={config.linePath}
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  fill="none"
                  className="text-foreground/25"
                  mask={`url(#mask-${slot.runId})`}
                />
              </svg>
            </div>

            {/* Card */}
            <div
              className="absolute z-30 pointer-events-none"
              style={{
                ...config.cardStyle,
                opacity: showCard ? (isFading ? 0 : 1) : 0,
                transition:
                  showCard && !isFading
                    ? "opacity 0.4s ease-out"
                    : "opacity 1.2s ease-in-out",
              }}
            >
              <div className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-sm max-w-[150px] sm:max-w-[200px]">
                <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium block">
                  {activity.action}
                </span>
                <p className="text-[11px] sm:text-[13px] text-foreground/80 mt-0.5 leading-snug">
                  {slot.phase === "typing" ? (
                    <TypewriterText text={activity.text} />
                  ) : showCard ? (
                    activity.text
                  ) : (
                    "\u00A0"
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes reveal-line {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </>
  );
}
