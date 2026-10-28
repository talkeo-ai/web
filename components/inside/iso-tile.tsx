import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * An isometric tile, the one shape the home is drawn with (after Cartesia's
 * layered stack, Joaquin's reference, 27/oct). A rounded square laid on the
 * floor plane — `scale(1, K) rotate(45°)` — over its edge: the same
 * shape a few pixels lower, in a deeper shade, both outlined alike.
 *
 * The edge is filled in the outline's own colour, green or grey, so the lip
 * reads as one solid band (Joaquin, 27/oct).
 *
 * The edge is thin and darker than the face, as Cartesia draws it: thick or
 * the same shade, it read as two layers stacked; drawn as walls, it stopped
 * looking like Cartesia at all (Joaquin, 27/oct).
 */

export type IsoState = "active" | "done" | "idle";

/**
 * How much the floor plane squashes in depth: 0.64, seen a little more from
 * above than true isometric (tan 30° = 0.577). At 0.577, and more so at
 * Cartesia's 0.5, the tiles read as lying too flat; at 0.68, too upright
 * (Joaquin, 27/oct).
 */
const K = 0.64;
const ISO = `scale(1 ${K}) rotate(45)`;

const FACE: Record<IsoState, { top: string; edge: string; line: string; icon: string }> = {
  active: {
    top: "fill-accent-100 dark:fill-accent-900",
    edge: "fill-accent-700 dark:fill-accent-400",
    line: "stroke-accent-700 dark:stroke-accent-400",
    icon: "text-accent-800 dark:text-accent-200",
  },
  done: {
    top: "fill-accent-50 dark:fill-accent-950",
    edge: "fill-accent-500 dark:fill-accent-700",
    line: "stroke-accent-500 dark:stroke-accent-700",
    icon: "text-accent-600 dark:text-accent-400",
  },
  idle: {
    top: "fill-background dark:fill-surface-secondary",
    edge: "fill-surface-quaternary",
    line: "stroke-surface-quaternary",
    icon: "text-text-tertiary",
  },
};

const HOVER: Record<IsoState, string> = {
  active:
    "group-hover:brightness-110 group-hover:drop-shadow-[0_6px_16px_color-mix(in_oklch,var(--color-accent-500)_22%,transparent)] group-focus-visible:brightness-110",
  done: "group-hover:brightness-105 group-hover:drop-shadow-[0_6px_14px_color-mix(in_oklch,var(--color-accent-500)_14%,transparent)] group-focus-visible:brightness-105",
  idle: "group-hover:brightness-105 group-hover:drop-shadow-[0_6px_14px_rgb(0_0_0/0.08)] dark:group-hover:brightness-125 dark:group-hover:drop-shadow-[0_6px_14px_rgb(255_255_255/0.06)] group-focus-visible:brightness-105",
};

/** Width and height a tile of plane-side `s` takes on screen, edge included. */
export function isoBox(s: number) {
  return { w: s * Math.SQRT2, h: s * Math.SQRT2 * K, lip: Math.max(3, s * 0.075) };
}

export function IsoTile({
  s,
  x,
  y,
  state,
  Icon,
}: {
  /** Side of the square on the floor plane. */
  s: number;
  /** Centre of the top face, in the parent drawing's units. */
  x: number;
  y: number;
  state: IsoState;
  Icon?: LucideIcon;
}) {
  const face = FACE[state];
  const { lip } = isoBox(s);
  const r = s * 0.18;
  const icon = s * 0.44;
  const square = (
    <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={r} vectorEffect="non-scaling-stroke" />
  );

  return (
    <g strokeWidth={1}>
      <g transform={`translate(${x} ${y + lip}) ${ISO}`} className={cn(face.edge, face.line)}>
        {square}
      </g>
      <g transform={`translate(${x} ${y}) ${ISO}`} className={cn(face.top, face.line)}>
        {square}
        {Icon && (
          // Upright on the face: laid along it, turned 45°, it read as
          // crooked (Joaquin, 27/oct).
          <g className={face.icon} transform="rotate(-45)">
            <Icon
              x={-icon / 2}
              y={-icon / 2}
              width={icon}
              height={icon}
              strokeWidth={1.75}
            />
          </g>
        )}
      </g>
    </g>
  );
}

/**
 * A tile drawn on its own, sized to its box. The lit one glows, barely: at
 * 28% the glow was the first thing seen (Joaquin, 27/oct).
 */
export function IsoTileSvg({
  s,
  state,
  Icon,
  interactive,
  className,
}: {
  s: number;
  state: IsoState;
  Icon?: LucideIcon;
  interactive?: boolean;
  className?: string;
}) {
  const { w, h, lip } = isoBox(s);
  const pad = 2;
  return (
    <svg
      viewBox={`0 0 ${w + pad * 2} ${h + lip + pad * 2}`}
      width={w + pad * 2}
      height={h + lip + pad * 2}
      className={cn(
        "overflow-visible",
        state === "active" &&
          "drop-shadow-[0_6px_14px_color-mix(in_oklch,var(--color-accent-500)_12%,transparent)]",
        // Pressable, it answers the pointer in light: a touch brighter and a
        // little glow in its own colour, the same gesture for every state.
        // Moving read as too much, and a new colour as overdone (Joaquin,
        // 27/oct).
        interactive &&
          "transition-[filter] duration-(--duration-highlight-out) group-hover:duration-(--duration-highlight-in) group-focus-visible:duration-(--duration-highlight-in)",
        interactive && HOVER[state],
        className,
      )}
      aria-hidden
    >
      <IsoTile s={s} x={w / 2 + pad} y={h / 2 + pad} state={state} Icon={Icon} />
    </svg>
  );
}
