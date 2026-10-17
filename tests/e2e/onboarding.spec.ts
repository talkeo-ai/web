import { expect, test } from "@playwright/test";

/**
 * The onboarding, end to end, against the recorded channel.
 *
 * What is held here is the walk somebody actually does: the press that enters,
 * the first turn arriving, the surface coming up under it, and answering on the
 * surface. The recording answers in the same shape and at roughly the same pace
 * as the service, which is the only reason this is worth running.
 */

/** A turn takes about a second to come back, here as in the service. */
const TURN = { timeout: 15_000 };

/** Wait until Talkeo has said something. */
async function spoken(page: import("@playwright/test").Page) {
  await expect(page.locator('[data-slot="turn-text"]').first()).toContainText(
    "Hola",
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

test("the message goes first, and the surface arrives under it", async ({
  page,
}) => {
  await page.goto("/es/onboarding");

  // Talkeo says it first. This is the half that was inverted: the surface came
  // up at two seconds and the words at nine.
  await spoken(page);

  // Then the surface comes up in the thread, under the message that asked.
  const surface = page.locator('[data-slot="chat-surface"]');
  await expect(surface).toBeVisible(TURN);
  await expect(surface.locator('[data-slot="surface-name"]')).toBeVisible();
  await expect(page.locator('[data-slot="turn-text"]').first()).toBeVisible();

  // ⚠ No raw key ever reaches a screen. A namespace applied twice —
  // `t("surfaces.scope.title")` inside a `t` already scoped to
  // `onboarding.surfaces` — put `onboarding.surfaces.surfaces.scope.title` on
  // screen as the surface's title, and nothing failed. Seen 9/sep.
  await expect(page.locator("body")).not.toContainText("onboarding.");
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

test("the field is always there, whichever way they answer", async ({ page }) => {
  await page.goto("/es/onboarding");
  await spoken(page);

  await expect(page.locator('[data-slot="composer-field"]')).toBeVisible();
  await expect(page.locator('[data-slot="view-toggle"]')).toHaveCount(0);
});

test("the composer offers no call while they give their name, and send with something", async ({
  page,
}) => {
  await page.goto("/es/onboarding");
  await spoken(page);

  // Speaking is the question after the name, so it is not offered before it.
  const action = page.locator('[data-slot="composer-action"]');
  await expect(action).toHaveAttribute("data-action", "send");
  await expect(action).toBeDisabled();

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
