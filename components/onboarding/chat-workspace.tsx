"use client";

import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { ChatScreen } from "@/components/onboarding/chat-screen";
import {
  CLOSE_MS,
  CONTENT_IN_MS,
  OPEN_MS,
} from "@/lib/onboarding/motion";
import {
  CollapseIcon,
  ExpandIcon,
  PanelButton,
  PanelIcon,
  usePanelWidth,
  WorkPanel,
} from "@/components/onboarding/work-panel";
import type { Step, TalkeoTurn } from "@/core/contracts";
import { firstScreenOf } from "@/lib/onboarding/screens";

type FetchTurn = () => Promise<{ turn: TalkeoTurn; step: Step } | null>;


type Layout = "closed" | "side" | "full";

/**
 * The conversation, and whatever it opens beside itself.
 *
 * The service moving the run on used to mean navigating: the assistant said
 * its closing line and the chat was replaced by the exercises. It does not any
 * more. Talkeo stays where it is and the work appears next to it, so what it
 * just asked you is still readable while you answer.
 *
 * Three states, and one property does all three. A two-column grid whose
 * `grid-template-columns` moves between `1fr 0%`, `1fr N%` and `0fr 100%`:
 * closed, beside, and filling the screen. Animating the track and not the
 * panel is what makes the column beside it genuinely give up its width rather
 * than be covered — both have to travel together or the text underneath jumps
 * to its new measure a beat early.
 *
 * Filling the screen does not end the conversation either. The transcript goes
 * and the composer stays, floating, so Talkeo is a click away with the
 * exercise at full size.
 */
export function ChatWorkspace({
  name,
  current,
  next,
}: {
  name: string | null;
  current: FetchTurn;
  next: FetchTurn;
}) {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState<Step | null>(null);
  const [layout, setLayout] = useState<Layout>("closed");
  const [opened, setOpened] = useState(false);

  const { fraction, dragging, handleProps } = usePanelWidth();
  // The panel's foot, handed over once it exists. State and not a ref: the
  // portal has to re-render when the node appears, and a ref does not say so.
  const [dock, setDock] = useState<HTMLElement | null>(null);

  const working = step !== null && step !== "talkeo_interview";
  const wants = working && layout !== "closed";
  const screen = working ? firstScreenOf(step) : null;

  // The panel is laid out at the width it is heading for, so it needs that in
  // pixels — a percentage would shrink with the track it lives in, which is
  // the squeeze this is here to avoid.
  const frame = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setFrameWidth(entry?.contentRect.width ?? 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Mounted at zero width for one frame, then given its width, so the browser
  // has two values to animate between. Setting both in the same commit is a
  // jump with a transition attached to it.
  //
  // Closing is adjusted during render instead: it has to be false in the same
  // commit that drops the panel, or the frame in between renders a column
  // that is open with nothing in it.
  if (!wants && opened) setOpened(false);

  useEffect(() => {
    if (!wants) return;
    const raf = requestAnimationFrame(() => setOpened(true));
    return () => cancelAnimationFrame(raf);
  }, [wants]);

  // Closing has to be as long as opening, so the panel stays in the tree until
  // the track has finished shutting over it. Dropped on the click, the width
  // animates with nothing inside and what you see is the panel vanishing and
  // the column growing into the space afterwards.
  const [rendered, setRendered] = useState(false);
  if (wants && !rendered) setRendered(true);

  useEffect(() => {
    if (wants) return;
    const timer = setTimeout(() => setRendered(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [wants]);

  const full = layout === "full";
  /** Still on screen, already on its way out. */
  const travelMs = rendered && !wants ? CLOSE_MS : OPEN_MS;

  // Both tracks stated outright, and never `1fr`.
  //
  // `1fr` is `minmax(auto, 1fr)`, and that `auto` is the automatic minimum
  // size — the `min-content` of whatever is inside. So the conversation's
  // track refuses to go below the width of its longest word plus the
  // composer, and full screen leaves a few hundred pixels of squashed chat
  // down the left while the panel is pushed off its own edge. Percentages
  // have no automatic minimum: zero means zero.
  const columns = !opened
    ? "100% 0%"
    : full
      ? "0% 100%"
      : `${(1 - fraction) * 100}% ${fraction * 100}%`;

  // The conversation is composed at the width it has when the panel is beside
  // it, and that width does not change when the panel goes full screen —
  // `fraction` is untouched by maximising. So the track closes over the chat
  // and covers it, instead of the chat re-wrapping into a sliver on its way
  // out. Opening and closing the panel do move it, and there re-wrapping is
  // right: the column is genuinely giving up room.
  const chatWidth = frameWidth
    ? Math.round(frameWidth * (layout === "closed" ? 1 : 1 - fraction))
    : null;

  // Closing from full screen, the chat is still completely covered, so it can
  // take its new width in the same frame the track starts opening — nobody can
  // see it happen, and what is uncovered is already composed. Closing from
  // beside the panel it is in plain sight and gaining real room, so there the
  // width has to travel.
  const chatBox = useRef<HTMLDivElement>(null);
  const cameFrom = useRef<Layout>(layout);

  useLayoutEffect(() => {
    const node = chatBox.current;
    if (!node) return;

    const from = cameFrom.current;
    cameFrom.current = layout;
    const behindThePanel = from === "full" && layout === "closed";

    node.style.transition =
      behindThePanel || dragging
        ? "none"
        : `width ${travelMs}ms var(--ease-entrance)`;
    node.style.width = chatWidth === null ? "100%" : `${chatWidth}px`;
  }, [layout, chatWidth, dragging, travelMs]);

  return (
    // A definite height, not a minimum: a box only overflows against one, and
    // both columns here scroll on their own. `dvh` rather than `vh` because on
    // a phone the browser chrome moves and `vh` does not.
    <div
      ref={frame}
      data-slot="chat-workspace"
      data-layout={layout}
      className="relative grid h-dvh"
      style={{
        gridTemplateColumns: columns,
        // Never while dragging: the pointer is already the animation, and
        // easing behind it turns a drag into a chase.
        transition: dragging
          ? undefined
          : `grid-template-columns ${travelMs}ms var(--ease-entrance)`,
      }}
    >
      <div className="relative min-h-0 overflow-hidden">
        <div
          ref={chatBox}
          className="absolute inset-y-0 left-0 flex flex-col"
        >
          <ChatScreen
            name={name}
            current={current}
            next={next}
            dock={full ? dock : null}
            onStep={(reached) => {
              setStep(reached);
              // Work arriving opens itself. Nobody asked for a panel; they
              // asked for the exercise, and the exercise is what the panel is.
              if (reached !== "talkeo_interview") {
                setLayout((previous) =>
                  previous === "closed" ? "side" : previous,
                );
              }
            }}
          />
        </div>
      </div>

      {rendered && screen ? (
        <WorkPanel
          title={t(`screens.${screen}.title`)}
          width={full ? frameWidth : Math.round(frameWidth * fraction)}
          travelMs={travelMs}
          open={wants}
          dragging={dragging}
          resizable={!full}
          handleProps={handleProps}
          onDock={setDock}
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="font-heading text-lg font-semibold">
              {t(`screens.${screen}.title`)}
            </p>
            <p className="text-text-secondary max-w-sm text-sm">
              {t(`screens.${screen}.body`)}
            </p>
          </div>
        </WorkPanel>
      ) : null}

      {/* Outside the panel, and above it. Showing and hiding is the one control
          that has to be in the same place whether or not there is a panel — put
          inside, it goes away with the thing it brings back, and you are left
          hunting for a button that was under your cursor a second ago.
          Maximising may come and go: it has nothing to do when there is
          nothing open.

          They line up with the panel's own header, which starts at the top
          of the window. */}
      {working ? (
        <div className="absolute top-0 right-2 z-50 flex h-11 items-center gap-1">
          <div
            style={{
              opacity: layout === "closed" ? 0 : 1,
              pointerEvents: layout === "closed" ? "none" : undefined,
              transition: `opacity ${CONTENT_IN_MS}ms var(--ease-standard)`,
            }}
          >
            <PanelButton
              label={full ? t("panel.restore") : t("panel.expand")}
              onClick={() => setLayout(full ? "side" : "full")}
            >
              {full ? CollapseIcon : ExpandIcon}
            </PanelButton>
          </div>

          <PanelButton
            label={layout === "closed" ? t("panel.show") : t("panel.hide")}
            onClick={() => setLayout(layout === "closed" ? "side" : "closed")}
          >
            {PanelIcon}
          </PanelButton>
        </div>
      ) : null}
    </div>
  );
}
