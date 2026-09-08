import { expect, test } from "@playwright/test";

import { answerTheName, enterTheRun } from "./enter-the-run";

/**
 * The way into the run and the step guard.
 *
 * Everything here asserts on properties rather than on wording: which screen
 * the URL is on, where a redirect lands.
 */

test("the public site reaches the run", async ({ page }) => {
  await page.goto("/es");

  // The public page offers the same door three times — the button, the orb and
  // a footer link. This is the button.
  await page
    .locator('[data-slot="button"]')
    .filter({ hasText: "Comenzar ahora" })
    .click();

  // The door has no screen of its own: it is a redirect to the first question.
  await expect(page).toHaveURL(/\/es\/onboarding\/name$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("answering the first question is what opens a run", async ({
  page,
  context,
}) => {
  await page.goto("/es/onboarding/name");
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "talkeo_sid"),
  ).toBeUndefined();

  await answerTheName(page);

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "talkeo_sid")).toBeDefined();
});

test("a screen from another step sends the visitor where the run actually is", async ({
  page,
}) => {
  await enterTheRun(page);

  await page.goto("/es/onboarding/result");

  await expect(page).toHaveURL(/\/es\/onboarding\/chat$/);
});

test("a question already answered is not asked again", async ({ page }) => {
  await enterTheRun(page);

  await page.goto("/es/onboarding/name");

  await expect(page).toHaveURL(/\/es\/onboarding\/chat$/);
});

test("without a run, a screen sends the visitor to the first question", async ({
  page,
}) => {
  await page.goto("/es/onboarding/chat");

  await expect(page).toHaveURL(/\/es\/onboarding\/name$/);
});
