import { expect, test, type Page } from "@playwright/test";

/**
 * The opening screens, walked the way a visitor walks them.
 *
 * Everything here asserts on properties rather than on wording: which screen
 * the URL is on, whether a control is available, where a redirect lands. The
 * labels used to click are Spanish because that locale is served under a prefix
 * and reads unambiguously, not because the copy is being checked.
 */

const START = "/es/onboarding";

async function openTheRun(page: Page) {
  await page.goto(START);
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/self-assessment$/);
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

test("the opening questions lead to the guide", async ({ page, context }) => {
  await openTheRun(page);

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "talkeo_sid")).toBeDefined();

  // The first answer is a link, so it lands in the next screen's URL and
  // nothing is held in client state.
  await page
    .getByRole("link", { name: "Puedo tener conversaciones simples" })
    .click();
  await expect(page).toHaveURL(
    /\/es\/onboarding\/areas\?level=simple_conversations$/,
  );

  const submit = page.getByRole("button", { name: "Seguir" });
  await expect(submit).toBeDisabled();

  await page.getByText("Conversación", { exact: true }).click();
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/es\/onboarding\/meet-kai$/);

  await page.getByLabel("¿Cómo te llamamos?").fill("Alex");
  await page.getByRole("button", { name: "Prefiero texto" }).click();

  // Declining the microphone moves the run on rather than blocking it.
  await expect(page).toHaveURL(/\/es\/onboarding\/interview$/);
});

test("choosing everything replaces the individual answers", async ({
  page,
}) => {
  await openTheRun(page);
  await page.getByRole("link", { name: "Recién empiezo" }).click();

  await page.getByText("Gramática", { exact: true }).click();
  await page.getByText("Todo", { exact: true }).click();

  const grammar = page.locator('input[type="checkbox"][value="grammar"]');
  await expect(grammar).toBeDisabled();

  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/meet-kai$/);
});

test("going back re-asks the question instead of losing the run", async ({
  page,
}) => {
  await openTheRun(page);
  await page
    .getByRole("link", { name: "Puedo hablar de varios temas" })
    .click();

  await page.goBack();
  await expect(page).toHaveURL(/\/es\/onboarding\/self-assessment$/);

  // A different answer travels in the URL, which is what makes changing it work
  // with nothing to reset.
  await page.getByRole("link", { name: "Recién empiezo" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\/areas\?level=just_starting$/);
});

test("a screen from another step sends the visitor where the run actually is", async ({
  page,
}) => {
  await openTheRun(page);

  await page.goto("/es/onboarding/result");

  await expect(page).toHaveURL(/\/es\/onboarding\/self-assessment$/);
});

test("the opening screens ask for the first answer before the second", async ({
  page,
}) => {
  await openTheRun(page);

  // Both answers go up in one call, so the second screen has nothing to submit
  // without the first.
  await page.goto("/es/onboarding/areas");

  await expect(page).toHaveURL(/\/es\/onboarding\/self-assessment$/);
});

test("without a run, a screen sends the visitor to the door", async ({
  page,
}) => {
  await page.goto("/es/onboarding/self-assessment");

  await expect(page).toHaveURL(/\/es\/onboarding$/);
});
