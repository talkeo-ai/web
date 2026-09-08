import { expect, test, type Page } from "@playwright/test";

import { enterTheRun, reachTheDeck } from "./enter-the-run";

/**
 * The assistant's turn, played against the fixture adapter.
 *
 * What is asserted is the mechanism, not the copy: that a turn arrives a line
 * at a time rather than all at once, that turning motion down gives it whole,
 * and that the conversation hands over to the measurement when it is done. The
 * recorded turns are Spanish, and the run is walked in that locale because it
 * is the one served under a prefix.
 */

const WORD = '[data-slot="turn-text"] p span';

/** How much of the turn is legible right now, counted in words. */
async function visibleWords(page: Page): Promise<number> {
  const opacity = await page
    .locator(WORD)
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).opacity),
    );
  return opacity.filter((value) => Number(value) > 0.5).length;
}

test("the turn arrives a line at a time", async ({ page }) => {
  await enterTheRun(page);

  // Every word is in the document before any of it is readable, so the
  // paragraph never reflows as the voice goes.
  await expect(page.locator(WORD).first()).toBeAttached({ timeout: 20_000 });
  const words = await page.locator(WORD).count();
  expect(words).toBeGreaterThan(1);

  await expect
    .poll(() => visibleWords(page), { timeout: 10_000 })
    .toBeGreaterThan(0);
  expect(await visibleWords(page)).toBeLessThan(words);

  await expect.poll(() => visibleWords(page), { timeout: 20_000 }).toBe(words);
});

test("with motion turned down the turn is there whole", async ({ page }) => {
  // Set before anything loads: the preference is read as the turn renders, so
  // emulating it afterwards would only affect the turn after this one.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterTheRun(page);

  await expect(page.locator(WORD).first()).toBeAttached({ timeout: 20_000 });
  expect(await visibleWords(page)).toBe(await page.locator(WORD).count());
});

test("the conversation hands over to the measurement", async ({ page }) => {
  // Motion down, because this is about where the run goes and not how long a
  // turn takes to say. Played out, the recorded turns run past a minute and
  // the walk would be timing out on the assistant rather than on a bug.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await reachTheDeck(page);

  // The conversation does not end when the work opens: it is beside it.
  await expect(page.locator('[data-slot="chat-workspace"]')).toBeVisible();
});
