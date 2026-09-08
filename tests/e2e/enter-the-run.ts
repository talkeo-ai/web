import { expect, type Page } from "@playwright/test";

/**
 * The three screens that lead into the conversation, walked the way a visitor
 * walks them.
 *
 * A helper and not a spec, because every test after the entrance starts by
 * getting through it — and Playwright refuses to let one spec import another,
 * which is the rule that keeps a shared step from quietly becoming a test that
 * runs twice.
 *
 * The labels are Spanish because that locale is served under a prefix and reads
 * unambiguously, not because the copy is being checked.
 */

export async function answerTheName(page: Page, name = "Ana") {
  await page.goto("/es/onboarding");
  await expect(page).toHaveURL(/\/es\/onboarding\/name$/);

  await page.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/mode$/);
}

/** Into the conversation, which is where every screen after this one lives. */
export async function enterTheRun(page: Page) {
  await answerTheName(page);
  await page.getByRole("button", { name: "Prefiero escribir" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/chat$/);
}

/**
 * On to the exercises.
 *
 * How many turns the interview takes is the service's business, so this
 * presses on until the work appears rather than counting to a number this side
 * made up.
 */
export async function reachTheDeck(page: Page) {
  await enterTheRun(page);

  const composer = page.getByRole("textbox").first();
  const deck = page.locator('[data-slot="card-deck"]');

  for (let turn = 0; turn < 10; turn += 1) {
    if (await deck.count()) break;
    await composer.fill("dale");
    await composer.press("Enter");
    await page.waitForTimeout(1_200);
  }

  await expect(deck).toBeVisible({ timeout: 20_000 });
  return deck;
}
