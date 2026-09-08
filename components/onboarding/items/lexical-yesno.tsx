"use client";

import { useTranslations } from "next-intl";

import { CardFace } from "@/components/onboarding/items/card-face";
import {
  SwipeCard,
  type CardExit,
} from "@/components/onboarding/items/swipe-card";
import { Button } from "@/components/ui/button";
import type { ItemOf, LexicalYesNoResponse } from "@/core/contracts";
import { useShownAt } from "@/lib/onboarding/use-shown-at";

/**
 * A word, and whether it is known.
 *
 * The card is answered by dragging it away — right for yes, left for no — and
 * by two buttons that do exactly the same thing. Both, not one: an exercise
 * that can only be answered by dragging cannot be answered with a keyboard, and
 * this is the first thing a run asks.
 *
 * Nothing here is graded on screen and nothing is ever confirmed back. What
 * gets sent is the answer and how long it took to give.
 */
export function LexicalYesNo({
  item,
  onAnswer,
}: {
  item: ItemOf<"lexical_yesno">;
  onAnswer: (response: LexicalYesNoResponse, exit: CardExit) => void;
}) {
  const t = useTranslations("onboarding.items.lexicalYesno");
  const since = useShownAt();

  return (
    <SwipeCard
      onSwipe={(exit) =>
        onAnswer(
          {
            answer: exit.side === "right" ? "yes" : "no",
            latency_ms: since(),
          },
          exit,
        )
      }
    >
      {({ answer, side, commitment }) => (
        <CardFace
          side={side}
          commitment={commitment}
          hints={{ left: t("no"), right: t("yes") }}
          footer={
            <div className="flex gap-3">
              <Button
                type="button"
                size="md"
                variant="secondary"
                className="flex-1"
                onClick={() => answer("left")}
              >
                {t("no")}
              </Button>
              <Button
                type="button"
                size="md"
                className="flex-1"
                onClick={() => answer("right")}
              >
                {t("yes")}
              </Button>
            </div>
          }
        >
          {/* The word is the whole exercise, so it gets the size that says so.
              Wrapping is allowed rather than shrunk to fit: a compound that
              breaks over two lines is still readable, and a word scaled down
              to stay on one is a different card. */}
          <p className="font-heading text-4xl font-semibold tracking-[-0.02em] wrap-anywhere sm:text-5xl">
            {item.payload.word}
          </p>
          <p className="text-text-secondary text-sm">{t("question")}</p>
        </CardFace>
      )}
    </SwipeCard>
  );
}
