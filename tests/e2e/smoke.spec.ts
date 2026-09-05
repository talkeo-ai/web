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
  // One word each, and one that only exists in that language — the point is
  // that the right locale was served, not that the headline still says what it
  // said the day this was written.
  await page.goto("/es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("mejorá");

  await page.goto("/pt");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "melhore",
  );
});

test("the header switches locale by navigating, not by mutating state", async ({
  page,
}) => {
  await page.goto("/es");

  // Every language is named in itself, never translated into the one being
  // read, so the Portuguese entry says "Português" from any locale.
  await page.getByRole("button", { name: "Idioma" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Português" }).click();

  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
});

test("the theme survives a reload, and is on the element before paint", async ({
  page,
}) => {
  // Pinned, not left to the runner's default: with no stored choice the
  // system preference is what decides, so it is an input to this test.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/es");

  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(html).toHaveClass(/dark/);

  // The reload is the point: the document is prerendered light, so a stored
  // choice only holds if the bootstrap script beats the first paint.
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("the surfaces bar pages sideways and wraps at the end", async ({
  page,
}) => {
  // Narrow on purpose: at a wide viewport every item fits, there is nothing to
  // scroll, and the test would pass without exercising anything.
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/es");

  const track = page.locator('[data-slot="surfaces-track"]');
  const offset = () => track.evaluate((el: HTMLElement) => el.scrollLeft);
  const next = page.getByRole("button", { name: "Siguiente" });

  // Waits for the smooth scroll to land. Reading `scrollLeft` mid-animation
  // reports a position the row has already left, and pressing again on that
  // stale reading would overshoot the end and wrap early.
  const settled = async () => {
    let previous = -1;
    let current = await offset();
    while (previous !== current) {
      await page.waitForTimeout(120);
      previous = current;
      current = await offset();
    }
    return current;
  };

  const max = await track.evaluate(
    (el: HTMLElement) => el.scrollWidth - el.clientWidth,
  );
  expect(max).toBeGreaterThan(0);

  expect(await offset()).toBe(0);
  await next.click();
  expect(await settled()).toBeGreaterThan(0);

  // Walk to the far end. Counting presses would not do it: how many fit before
  // the end depends on the label widths, so the locale would decide whether
  // the loop lands on the wrap or one short of it.
  for (let i = 0; i < 20 && (await settled()) < max - 1; i++) {
    await next.click();
  }
  expect(await settled()).toBeGreaterThanOrEqual(max - 1);

  // Now at the end, one more press returns to the start.
  await next.click();
  expect(await settled()).toBe(0);
});

test("the footer reaches every legal page, and each one renders", async ({
  page,
}) => {
  await page.goto("/es");

  for (const [label, path] of [
    ["Términos", "/es/terms"],
    ["Privacidad", "/es/privacy"],
    ["Reembolsos", "/es/refunds"],
  ]) {
    await page.goto("/es");
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));

    // A heading and at least one section: an empty shell would still pass a
    // status check, and these pages are nothing but their content.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.getByRole("heading", { level: 2 }).count(),
    ).toBeGreaterThan(0);
  }
});

test("a route under (app) renders its shell and then its dynamic part", async ({
  page,
}) => {
  await page.goto("/home");

  await expect(page.getByText("Session active")).toBeVisible();
});
