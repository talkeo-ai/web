"use client";

import { useEffect, useRef, useState } from "react";

import {
  LOBES,
  OVERHANG,
  createGlowRenderer,
  readBands,
  standInBands,
  type Rgba,
} from "@/lib/onboarding/voice-glow-gl";

/**
 * The glow behind the composer while they are in a call.
 *
 * It rises from behind the field with whoever is talking: blue with their
 * microphone, Talkeo's clay with Talkeo's voice, and it changes colour as the
 * turn changes hands. The reference is claude.ai's voice mode (Joaquin, 22/oct).
 *
 * Mounted while `shown` and while it fades out after, so leaving the call is a
 * fade and not a cut.
 */

/**
 * Their colour, and Talkeo's. Theirs is a cool silver, `oklch(0.8 0.02 250)`,
 * neutral like everything of theirs on the screen; Talkeo's is the blue
 * claude.ai gives the person (Joaquin, 22/oct, after trying the accent green).
 */
const THEM: Rgba = [180 / 255, 191 / 255, 202 / 255, 1];
const TALKEO: Rgba = [106 / 255, 155 / 255, 204 / 255, 1];
/**
 * How far below the composer's foot the glow's box sits, so its lower half is
 * behind the field and the field cuts it, as in claude.ai. Anchored at the
 * foot, it floated clear of the field with a gap under it (Joaquin, 22/oct).
 */
const SINK_PX = 44;
/**
 * Nothing of it shows below this line, measured up from the composer's foot.
 * Clear of the rounded corners, so the glow is cut behind the field and never
 * seen under it, which it was (Joaquin, 22/oct).
 */
const CUT_ABOVE_FOOT_PX = 24;
/** How far the colour moves toward the other one per frame. */
const COLOR_EASE = 0.03;
/**
 * Two followers per lobe: a fast one off the meter and a slow one off the
 * fast, so a syllable swells a lobe and lets it down instead of flickering it.
 */
const FAST_KEEP = 0.92;
const SLOW_KEEP = 0.9;

export function VoiceGlow({
  shown,
  talking,
  talkingAloud,
  micMeter,
  talkeoMeter,
}: {
  shown: boolean;
  /** Talkeo has the turn. */
  talking: boolean;
  /** …and is saying it out loud, so there is a voice to follow. */
  talkingAloud: boolean;
  /** Their open, unmuted microphone, or null. */
  micMeter: AnalyserNode | null;
  /** Talkeo's voice, read each frame: the context behind it can be rebuilt. */
  talkeoMeter: () => AnalyserNode | null;
}) {
  const [present, setPresent] = useState(shown);
  if (shown && !present) setPresent(true);

  if (!present) return null;
  return (
    <div
      aria-hidden
      data-slot="voice-glow"
      data-state={shown ? "open" : "closed"}
      onAnimationEnd={() => {
        if (!shown) setPresent(false);
      }}
      className="voice-glow pointer-events-none absolute left-1/2 z-0 w-[150%] -translate-x-1/2"
      style={{
        aspectRatio: "4 / 1",
        contain: "layout",
        bottom: -SINK_PX,
        // Open on every side but the bottom, where the canvas runs on past the
        // box: it is cut there, behind the field.
        clipPath: `inset(-100% -100% ${SINK_PX + CUT_ABOVE_FOOT_PX}px -100%)`,
      }}
    >
      <GlowCanvas
        talking={talking}
        talkingAloud={talkingAloud}
        micMeter={micMeter}
        talkeoMeter={talkeoMeter}
      />
    </div>
  );
}

function GlowCanvas(props: {
  talking: boolean;
  talkingAloud: boolean;
  micMeter: AnalyserNode | null;
  talkeoMeter: () => AnalyserNode | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Read by the frame loop, which runs outside React and must not restart
  // every time the turn changes hands.
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const renderer = createGlowRenderer(element);
    if (!renderer) return;

    const resizes = new ResizeObserver(() => renderer.resize());
    resizes.observe(element);

    const raw = new Array<number>(LOBES).fill(0);
    const fast = new Array<number>(LOBES).fill(0);
    const slow = new Array<number>(LOBES).fill(0);
    const color: Rgba = [...(live.current.talking ? TALKEO : THEM)];
    let bins: Uint8Array<ArrayBuffer> | null = null;
    let start = 0;
    let frame = 0;

    const tick = (now: number) => {
      start ||= now;
      const t = (now - start) / 1000;
      const { talking, talkingAloud, micMeter, talkeoMeter } = live.current;

      const meter = talking ? (talkingAloud ? talkeoMeter() : null) : micMeter;
      if (meter) {
        if (bins?.length !== meter.frequencyBinCount) {
          bins = new Uint8Array(meter.frequencyBinCount);
        }
        readBands(meter, bins, raw);
      } else if (talking) {
        standInBands(t, raw);
      } else {
        raw.fill(0);
      }
      for (let i = 0; i < LOBES; i += 1) {
        fast[i] = FAST_KEEP * fast[i]! + (1 - FAST_KEEP) * raw[i]!;
        slow[i] = SLOW_KEEP * slow[i]! + (1 - SLOW_KEEP) * fast[i]!;
      }

      const toward = talking ? TALKEO : THEM;
      for (let c = 0; c < 4; c += 1) {
        color[c] = color[c]! + (toward[c]! - color[c]!) * COLOR_EASE;
      }

      renderer.draw(t, color, slow);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resizes.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      className="absolute start-0 top-0 w-full"
      style={{ height: `${(1 + OVERHANG) * 100}%` }}
    />
  );
}
