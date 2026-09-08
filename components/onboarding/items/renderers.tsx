"use client";

import { lazy } from "react";

import {
  isSupported,
  type ItemRenderer,
  type SupportedInstrument,
} from "@/components/onboarding/items/registry";
import type { CardExit } from "@/components/onboarding/items/swipe-card";
import type { Instrument, Item, ItemResponse } from "@/core/contracts";

/**
 * One renderer per instrument, loaded when one of them is actually served.
 *
 * The protocol defines seventeen exercises and a run draws a handful. Bundling
 * them together would mean every visitor downloading every kind of exercise to
 * be asked two of them, so each arrives on its own — the boundary is per
 * instrument because that is exactly the granularity at which the service
 * decides.
 */
const LexicalYesNo = lazy(() =>
  import("@/components/onboarding/items/lexical-yesno").then((module) => ({
    default: module.LexicalYesNo,
  })),
);

const MeaningCard = lazy(() =>
  import("@/components/onboarding/items/meaning-card").then((module) => ({
    default: module.MeaningCard,
  })),
);

/**
 * Keyed by exactly what the client declares. Leaving one out does not compile,
 * which is what stops the declaration and the drawing from drifting apart.
 */
const RENDERERS: { [I in SupportedInstrument]: ItemRenderer<I> } = {
  lexical_yesno: LexicalYesNo,
  meaning_card: MeaningCard,
};

/**
 * Draws whatever came down.
 *
 * Nothing to render is not an error state and gets no message: the service is
 * told what this client draws when the run opens, so an item it cannot draw is
 * a bug on the way in, not something to apologise for on the way out.
 */
export function RenderItem({
  item,
  onAnswer,
}: {
  item: Item;
  onAnswer: (response: ItemResponse, exit: CardExit) => void;
}) {
  if (!isSupported(item.instrument)) return null;

  // The instrument fixes both the payload and the response, but that
  // correlation does not survive a lookup — TypeScript checks the map against
  // the union rather than key by key. One cast, contained here, instead of a
  // branch per instrument that would say the same thing seventeen times.
  const Render = RENDERERS[item.instrument] as ItemRenderer<Instrument>;

  return <Render item={item} onAnswer={onAnswer} />;
}
