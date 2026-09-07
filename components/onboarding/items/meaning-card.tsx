"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CardFace } from "@/components/onboarding/items/card-face";
import {
  SwipeCard,
  type CardExit,
} from "@/components/onboarding/items/swipe-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemOf, MeaningCardResponse } from "@/core/contracts";
import { useShownAt } from "@/lib/onboarding/use-shown-at";

/**
 * Say what the word means, or say that you do not know it.
 *
 * The one card whose two sides are not equivalent, and the contract is what
 * makes them unequal: left is always open, and right only opens once there is
 * something to send. Passing without answering is what does not exist here —
 * an empty right swipe would be a card getting past the measurement without
 * saying anything, which is exactly what this instrument is for.
 *
 * So the right side resists until the field has something in it, and the copy
 * says the way out rather than leaving it to be discovered by pulling at a card
 * that will not go.
 */
export function MeaningCard({
  item,
  onAnswer,
}: {
  item: ItemOf<"meaning_card">;
  onAnswer: (response: MeaningCardResponse, exit: CardExit) => void;
}) {
  const t = useTranslations("onboarding.items.meaningCard");
  const since = useShownAt();
  const [meaning, setMeaning] = useState("");

  const said = meaning.trim();

  return (
    <SwipeCard
      allow={{ left: true, right: said.length > 0 }}
      onSwipe={(exit) =>
        onAnswer(
          exit.side === "left"
            ? { dont_know: true, latency_ms: since() }
            : { artefact: { kind: "text", text: said }, latency_ms: since() },
          exit,
        )
      }
    >
      {({ answer, side, commitment }) => (
        <CardFace
          side={side}
          commitment={commitment}
          hints={{ left: t("dontKnow"), right: said ? t("send") : undefined }}
          footer={
            <div className="flex flex-col gap-3">
              <Input
                value={meaning}
                onChange={(event) => setMeaning(event.target.value)}
                placeholder={t("placeholder")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && said) answer("right");
                }}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  size="md"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => answer("left")}
                >
                  {t("dontKnow")}
                </Button>
                <Button
                  type="button"
                  size="md"
                  className="flex-1"
                  disabled={!said}
                  onClick={() => answer("right")}
                >
                  {t("send")}
                </Button>
              </div>
            </div>
          }
        >
          <p className="font-heading text-4xl font-semibold tracking-[-0.02em] wrap-anywhere sm:text-5xl">
            {item.payload.word}
          </p>
          {item.payload.example ? (
            <p className="text-text-secondary max-w-sm text-sm italic">
              {item.payload.example}
            </p>
          ) : null}
          <p className="text-text-secondary max-w-sm text-sm">{t("ask")}</p>
        </CardFace>
      )}
    </SwipeCard>
  );
}
