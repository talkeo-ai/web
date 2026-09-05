import { expect, test, type Page } from "@playwright/test";

/**
 * The door into the run and the step guard, walked the way a visitor walks
 * them.
 *
 * Everything here asserts on properties rather than on wording: which screen
 * the URL is on, where a redirect lands. The labels used to click are Spanish
 * because that locale is served under a prefix and reads unambiguously, not
 * because the copy is being checked.
 *
 * The screens themselves are not walked yet: each one is built against the
 * fixture adapter and gets its own test as it lands.
 */

const START = "/es/onboarding";

async function openTheRun(page: Page) {
  await page.goto(START);
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/talkeo$/);
}

test("the public site reaches the run", async ({ page }) => {
  await page.goto("/es");

  // The public page offers the same door three times — the button, the orb and
  // a footer link. This is the button.
  await page
    .locator('[data-slot="button"]')
    .filter({ hasText: "Comenzar ahora" })
    .click();

  await expect(page).toHaveURL(/\/es\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("opening the run lands on the assistant, with a session", async ({
  page,
  context,
}) => {
  await openTheRun(page);

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "talkeo_sid")).toBeDefined();
});

test("a screen from another step sends the visitor where the run actually is", async ({
  page,
}) => {
  await openTheRun(page);

  await page.goto("/es/onboarding/result");

  await expect(page).toHaveURL(/\/es\/onboarding\/talkeo$/);
});

test("without a run, a screen sends the visitor to the door", async ({
  page,
}) => {
  await page.goto("/es/onboarding/talkeo");

  await expect(page).toHaveURL(/\/es\/onboarding$/);
});
