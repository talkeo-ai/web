import { expect, test, type Page } from "@playwright/test";

import { reachTheDeck } from "./enter-the-run";

/**
 * The measurement, answered both ways it can be answered.
 *
 * The point of the second test is the one that would otherwise go unnoticed: a
 * card that can only be answered by dragging cannot be answered with a
 * keyboard, and a card that can only be answered by pressing is not the
 * gesture this exercise is built on. Both have to move the deck on.
 */

/** The word on the card in hand. */
async function wordOnTop(deck: ReturnType<Page["locator"]>) {
  return deck.locator("p").first().textContent();
}

test("a card is answered with a button, and the next one arrives", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const deck = await reachTheDeck(page);
  const first = await wordOnTop(deck);

  await page.getByRole("button", { name: "La conozco", exact: true }).click();

  await expect.poll(() => wordOnTop(deck), { timeout: 10_000 }).not.toBe(first);
});

test("a card is answered by dragging it away", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const deck = await reachTheDeck(page);
  const first = await wordOnTop(deck);

  const box = (await deck.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  // Past the distance that commits, in steps rather than in one jump: one move
  // event would be a teleport, which is not what a hand does.
  await page.mouse.move(box.x + box.width / 2 - 220, y, { steps: 12 });
  await page.mouse.up();

  await expect.poll(() => wordOnTop(deck), { timeout: 10_000 }).not.toBe(first);
});
