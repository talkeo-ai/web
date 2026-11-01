import { LevelCheck } from "@/components/landing/level-check";

/**
 * The level measurement as a page of its own. The landing gets here without a
 * navigation — the first swipe moves its deck to the middle and rewrites the
 * URL — so this route is what a reload, a shared link or a direct visit see:
 * the same deck, already on stage.
 */
export default function LevelPage() {
  return (
    <main className="flex min-h-dvh flex-1">
      <LevelCheck standalone />
    </main>
  );
}
