import { expect, test } from "@playwright/test";

test("the root serves the default locale and hands out an anonymous id", async ({
  page,
  context,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "talkeo_uid")).toBeDefined();
});

test("each locale serves its own language", async ({ page }) => {
  await page.goto("/es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByText("Aprendé inglés practicando.")).toBeVisible();

  await page.goto("/pt");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(page.getByText("Aprenda inglês praticando.")).toBeVisible();
});

test("a route under (app) renders its shell and then its dynamic part", async ({
  page,
}) => {
  await page.goto("/home");

  await expect(page.getByText("Session active")).toBeVisible();
});
