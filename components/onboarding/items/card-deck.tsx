"use client";

import type { ReactNode } from "react";

import { CARD_TILT } from "@/components/onboarding/items/swipe-card";
import {
  CARD_BEHIND_SCALE,
  CARD_IN_MS,
  CARD_OUT_MS,
} from "@/lib/onboarding/motion";
import type { CardExit } from "@/components/onboarding/items/swipe-card";

/** How far a card travels off the deck, and how far it tips on the way. */
const EXIT_PX = 460;
const EXIT_DEG = 10;

export type DeckCard = {
  /** The card's own identity, which is what keeps its state while it leaves. */
  id: string;
  card: ReactNode;
  /** Set once it has been answered: where it is going, and from where. */
  exit?: CardExit;
};

/**
 * The stack, and the movement of playing off it.
 *
 * The card being answered tips away and fades while the plate under it rises
 * the last stretch to full size. They overlap on purpose — run one after the
 * other, it reads as a card being replaced rather than as a deck being played.
 *
 * The plate is a plate and not the next exercise. Drawing the next item early
 * would mean asking for it before this one is answered, and an item that has
 * been on screen is an item that was shown: the measurement would be counting a
 * card nobody has looked at yet.
 *
 * ⚠ Leaving is animated **here**, not in the card. A card that animated itself
 * out would be doing it inside a subtree the screen is about to replace, and
 * the exit would be cut off at its first frame. Cards keep their keys and are
 * only reordered, so the one on its way out keeps everything that was typed
 * into it while it goes.
 */
export function CardDeck({ cards }: { cards: DeckCard[] }) {
  return (
    // A floor under the deck, because between two cards the only thing in it is
    // the plate — which is positioned, so without this the box would collapse
    // and the card on its way out would leave from nowhere.
    <div data-slot="card-deck" className="relative min-h-[19rem] w-full">
      {/* Sized by the card in front of it rather than given a height of its
          own: an exercise decides how tall it is, and a plate with a fixed
          size would be short of some cards and long past others. */}
      <div
        aria-hidden
        className="border-border/60 bg-surface-secondary absolute inset-0 rounded-3xl border"
        style={{ transform: `scale(${CARD_BEHIND_SCALE})` }}
      />

      {cards.map(({ id, card, exit }) => (
        <div
          key={id}
          aria-hidden={exit ? true : undefined}
          // The live card is what gives the deck its height; the one leaving is
          // lifted out of the flow so the next one is already in its place.
          className={exit ? "pointer-events-none absolute inset-0" : "relative"}
          style={
            exit
              ? ({
                  "--card-from-x": `${exit.fromX}px`,
                  "--card-from-rotate": `${exit.fromX * CARD_TILT}deg`,
                  "--card-to-x": `${exit.side === "left" ? -EXIT_PX : EXIT_PX}px`,
                  "--card-to-rotate": `${exit.side === "left" ? -EXIT_DEG : EXIT_DEG}deg`,
                  animation: `card-out ${CARD_OUT_MS}ms var(--ease-exit) both`,
                } as React.CSSProperties)
              : ({
                  "--card-behind-scale": CARD_BEHIND_SCALE,
                  animation: `card-in ${CARD_IN_MS}ms var(--ease-entrance) both`,
                } as React.CSSProperties)
          }
        >
          {card}
        </div>
      ))}
    </div>
  );
}
