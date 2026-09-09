import { expect, test } from "@playwright/test";

/**
 * The onboarding, end to end, against the recorded channel.
 *
 * What is held here is the walk somebody actually does: the press that enters,
 * the first turn arriving, the surface coming up after it, answering on the
 * surface, and crossing between the two views. The recording answers in the same
 * shape and at roughly the same pace as the service, which is the only reason
 * this is worth running.
 */

/** A turn takes about a second to come back, here as in the service. */
const TURN = { timeout: 15_000 };

/**
 * Wait until Talkeo has said something.
 *
 * Anchored on the focus view rather than on the turn's text, because that text
 * is REPLACED by the surface once the turn has been said — so a test that waits
 * for it and then acts is racing the swap. `data-shows` says which of the two is
 * up and never goes back to nothing.
 */
async function spoken(page: import("@playwright/test").Page) {
  await expect(page.locator('[data-slot="focus-view"]')).not.toHaveAttribute(
    "data-shows",
    "nothing",
    TURN,
  );
}

test("the press on the landing lands in the conversation", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("link", { name: "Comenzar ahora" }).first().click();
  await expect(page).toHaveURL(/\/es\/onboarding$/);
  await expect(page.locator('[data-slot="onboarding"]')).toBeVisible(TURN);
});

test("Talkeo speaks first, and the bar says where that is", async ({ page }) => {
  await page.goto("/es/onboarding");

  const turn = page.locator('[data-slot="turn-text"]').first();
  await expect(turn).toContainText("Hola", TURN);

  const bar = page.locator('[data-slot="onboarding-progress"]');
  await expect(bar).toHaveAttribute("aria-valuenow", "1");
  // Seven, from the service. Never a number this side made up.
  await expect(bar).toHaveAttribute("aria-valuemax", "7");
});

test("the message goes before the surface arrives, never beside it", async ({
  page,
}) => {
  await page.goto("/es/onboarding");
  const focus = page.locator('[data-slot="focus-view"]');

  // Talkeo says it first, alone. This is the half that was inverted: the surface
  // came up at two seconds and the words at nine, one under the other.
  await expect(focus).toHaveAttribute("data-shows", "turn", TURN);
  await expect(page.locator('[data-slot="surface-name"]')).toHaveCount(0);

  // Then it takes its place, and carries the question itself — which it can,
  // because the turn that asked is no longer on screen to repeat.
  await expect(focus).toHaveAttribute("data-shows", "surface", TURN);
  await expect(page.locator('[data-slot="turn-text"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Cómo te llamás/ }),
  ).toBeVisible();
});

test("answering on the surface moves the conversation on", async ({ page }) => {
  await page.goto("/es/onboarding");
  const field = page.locator('[data-slot="surface-name"]');
  await expect(field).toBeVisible(TURN);
  await field.fill("Ana");
  await page.getByRole("button", { name: "Continuar" }).click();

  // The second entrance line, which is the one asking how they want to answer.
  await expect(page.locator('[data-slot="surface-mode-speak"]')).toBeVisible(
    TURN,
  );
});

test("the two views show the same conversation", async ({ page }) => {
  await page.goto("/es/onboarding");
  await spoken(page);

  const screen = page.locator('[data-slot="onboarding"]');
  await expect(screen).toHaveAttribute("data-view", "focus");

  await page.locator('[data-slot="view-toggle"]').click();
  await expect(screen).toHaveAttribute("data-view", "chat");
  // The field is always there in the chat, whichever way they chose to answer.
  await expect(page.locator('[data-slot="composer-field"]')).toBeVisible();

  await page.locator('[data-slot="view-toggle"]').click();
  await expect(screen).toHaveAttribute("data-view", "focus");
  // And never in focus.
  await expect(page.locator('[data-slot="composer-field"]')).toHaveCount(0);
});

test("the composer offers the call with nothing written, and send with something", async ({
  page,
}) => {
  await page.goto("/es/onboarding");
  await spoken(page);
  await page.locator('[data-slot="view-toggle"]').click();

  const action = page.locator('[data-slot="composer-action"]');
  await expect(action).toHaveAttribute("data-action", "call");

  await page.locator('[data-slot="composer-field"]').fill("hola");
  await expect(action).toHaveAttribute("data-action", "send");
});

test("leaving asks first, and staying keeps the conversation", async ({
  page,
}) => {
  await page.goto("/es/onboarding");
  await spoken(page);

  await page.locator('[data-slot="onboarding-exit"]').click();
  await expect(page.locator('[data-slot="exit-dialog"]')).toBeVisible();

  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.locator('[data-slot="exit-dialog"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/onboarding$/);
});
