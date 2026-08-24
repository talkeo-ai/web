import { expect, test } from "@playwright/test";

test("the app serves Spanish and hands out an anonymous id", async ({
  page,
  context,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "talkeo_uid")).toBeDefined();
});

test("a route under (app) renders its shell and then its dynamic part", async ({
  page,
}) => {
  await page.goto("/home");

  await expect(page.getByText("Sesión activa")).toBeVisible();
});
