/**
 * The hero's full-bleed background: a sky with a wall of cloud on the right,
 * behind the whole first screen, header included, fading into the page at the
 * bottom so the section below starts on plain ground.
 *
 * It is also what the measurement stands on: `LevelCheck` lays a light veil
 * over it, and here the sky eases forward a little as the stage opens, so
 * moving to the measurement reads as going further into the same place rather
 * than cutting to another screen. `/level` renders it too.
 *
 * Two sizes, so a phone does not download the 2560px file.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/sky.webp"
        srcSet="/hero/sky-1280.webp 1280w, /hero/sky.webp 2560w"
        sizes="100vw"
        alt=""
        fetchPriority="high"
        // The phone crops a narrow window out of a wide picture: there it
        // takes the open sky, so the clouds do not sit behind the headline.
        className="size-full origin-[70%_50%] object-cover object-[28%_50%] transition-transform duration-[1400ms] ease-(--ease-entrance) in-data-level-stage:scale-[1.06] lg:object-right motion-reduce:transition-none"
      />
      {/* A faint light from the left, under the copy. */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/10 to-transparent dark:from-black/30 dark:via-black/10" />
      <div className="to-background absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent" />
    </div>
  );
}
