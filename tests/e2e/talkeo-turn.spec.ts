import { expect, test, type Page } from "@playwright/test";

/**
 * The assistant's turn, played against the fixture adapter.
 *
 * What is asserted is the mechanism, not the copy: that the sentences arrive
 * one after another rather than together, that a mark lands on the target it
 * names, and that turning motion down gives the whole turn at once without
 * losing the marks. The recorded turns are Spanish, and the run is walked in
 * that locale because it is the one served under a prefix.
 */

const LINE = '[data-slot="onboarding-frame"] p span';
const CHIP = '[data-slot="mark-chip"]';

async function openTheRun(page: Page) {
  await page.goto("/es/onboarding");
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/talkeo$/);
}

/** How many of the turn's sentences are legible right now. */
async function visibleLines(page: Page): Promise<number> {
  const opacity = await page
    .locator(LINE)
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).opacity),
    );
  return opacity.filter((value) => Number(value) > 0.5).length;
}

test("the opening turn arrives a line at a time", async ({ page }) => {
  await openTheRun(page);

  // Three sentences, all of them in the document before any is readable, so
  // the paragraph never reflows as the voice goes.
  await expect(page.locator(LINE)).toHaveCount(3);

  await expect
    .poll(() => visibleLines(page), { timeout: 5_000 })
    .toBeGreaterThan(0);
  expect(await visibleLines(page)).toBeLessThan(3);

  await expect.poll(() => visibleLines(page), { timeout: 20_000 }).toBe(3);
});

test("a mark lands on the target it names", async ({ page }) => {
  await openTheRun(page);

  // The opening points at each way of answering as it offers it.
  const voice = page.locator(`${CHIP}[data-target="control:voice"]`);
  await expect(voice).toHaveAttribute("data-fired", "false");

  await expect(voice).toHaveAttribute("data-fired", "true", {
    timeout: 20_000,
  });
  await expect(page.locator(`${CHIP}[data-fired="true"]`)).toHaveCount(2);
});

test("the run walks turn by turn to the exercises", async ({ page }) => {
  // Motion down, because this is about where the run goes and not how long a
  // turn takes to say. Played out, the seven recorded turns run past half a
  // minute and the walk would be timing out on the assistant, not on a bug.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTheRun(page);

  const next = page.getByRole("button", { name: "Seguir" });

  // The opening arrives on its own, so six presses reach the seventh turn —
  // the one that closes the interview and moves the run to the exercises.
  for (let turn = 0; turn < 6; turn += 1) {
    await expect(next).toBeEnabled();
    await next.click();
  }

  // Pressing on from a closed interview is what asks the guard where to go.
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/exercises$/);
});

test("with motion turned down the turn is there whole, marks included", async ({
  page,
}) => {
  // Set before anything loads: the hook reads the preference as it renders, so
  // emulating it afterwards would only affect the turn after this one.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTheRun(page);

  await expect(page.locator(LINE)).toHaveCount(3);
  expect(await visibleLines(page)).toBe(3);

  // Nothing was waited for, so both marks are already on their targets.
  await expect(page.locator(`${CHIP}[data-fired="true"]`)).toHaveCount(2);
});
