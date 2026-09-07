"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { CardDeck, type DeckCard } from "@/components/onboarding/items/card-deck";
import { RenderItem } from "@/components/onboarding/items/renderers";
import type { CardExit } from "@/components/onboarding/items/swipe-card";
import type { Instrument, Item, ItemResponse, Step } from "@/core/contracts";
import { CARD_OUT_MS } from "@/lib/onboarding/motion";

export type FetchItem = () => Promise<{
  item: Item | null;
  step: Step | null;
} | null>;
export type AnswerItem = (
  itemId: string,
  response: ItemResponse,
) => Promise<Step | null>;
export type ReportView = (
  event: "card_shown" | "card_left",
  item: { item_id: string; instrument: Instrument },
) => Promise<void>;

/**
 * The measurement, one card at a time.
 *
 * The gesture is the whole evidence: what is sent is the attempt and how long
 * it took, and nothing comes back saying whether it was right. There is no
 * score on this screen and no place to put one.
 *
 * Which card comes next is the service's answer, asked for one at a time. This
 * never holds a queue — a card in hand is a card that has been shown, and
 * showing is exactly what gets reported.
 */
export function ItemsScreen({
  next,
  answer,
  report,
  onStep,
}: {
  next: FetchItem;
  answer: AnswerItem;
  /** Reported, never awaited: a card must not wait on it to appear or leave. */
  report: ReportView;
  /** Where the service says the run is, every time it says it. */
  onStep?: (step: Step) => void;
}) {
  const [item, setItem] = useState<Item | null>(null);
  const [leaving, setLeaving] = useState<{ item: Item; exit: CardExit } | null>(
    null,
  );
  const [done, setDone] = useState(false);

  const draw = async () => {
    const result = await next();
    if (result?.step) onStep?.(result.step);

    if (!result?.item) {
      // Not an empty queue: the step is over. The screen goes quiet and the
      // step that came back with it is what moves the run on.
      setDone(true);
      return;
    }

    setItem(result.item);
    void report("card_shown", result.item);
  };

  // The ref is what keeps development's double mount to one card. Asking twice
  // would put the first one straight into the transcript of shown cards
  // without anybody having seen it.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = (response: ItemResponse, exit: CardExit) => {
    const answered = item;
    if (!answered) return;

    // It leaves the moment it is answered, and the next one is asked for at
    // the same time. Waiting for the service to acknowledge before letting the
    // card go would put the whole round trip inside the gesture.
    setLeaving({ item: answered, exit });
    setItem(null);
    void report("card_left", answered);

    void answer(answered.item_id, response).then((step) => {
      if (step) onStep?.(step);
    });
    void draw();
  };

  // The card that has gone stays in the tree for exactly as long as it takes
  // to leave, and no longer: a stale one under the live card is a second card
  // the deck would keep sizing itself around.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), CARD_OUT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  // Deliberately ordered leaving-first. Both keep their keys, so answering
  // moves a card within the list rather than replacing it — which is what lets
  // it keep whatever was typed into it on the way out.
  const cards: DeckCard[] = [];
  if (leaving) {
    cards.push({
      id: leaving.item.item_id,
      exit: leaving.exit,
      card: <RenderItem item={leaving.item} onAnswer={() => {}} />,
    });
  }
  if (item) {
    cards.push({
      id: item.item_id,
      card: <RenderItem item={item} onAnswer={handleAnswer} />,
    });
  }

  return (
    <div
      data-slot="items-screen"
      data-done={done ? "" : undefined}
      className="mx-auto flex h-full w-full max-w-md items-center px-6"
    >
      {/* No spinner and no skeleton card. Between two cards the deck shows its
          plate, which is the same thing it shows while one is being answered —
          so nothing appears, flashes and goes. */}
      {/* Once the step is over the deck goes with it. An empty plate left
          behind reads as a card that failed to arrive. */}
      {done && cards.length === 0 ? null : (
        <Suspense fallback={null}>
          <CardDeck cards={cards} />
        </Suspense>
      )}
    </div>
  );
}
