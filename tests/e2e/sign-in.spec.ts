import { expect, test, type Page } from "@playwright/test";

/**
 * Signing in against the mock Core, which every build without `CORE_URL` uses.
 * The mock accepts one code for every address (`424242`, `core/mock/accounts.ts`)
 * and Google comes straight back to the callback, so each path runs end to end
 * through the real server actions, cookie and callback route.
 *
 * Each test signs in with its own address so the parallel runs never share an
 * account in the mock's memory.
 */

const CODE = "424242";

function address(name: string) {
  return `smoke-e2e-${name}-${Date.now()}@example.com`;
}

async function askForCode(page: Page, email: string) {
  await page.goto("/es/login");
  await page.getByLabel("Tu email").fill(email);
  await page.getByRole("button", { name: "Recibir código" }).click();
  await expect(
    page.getByRole("heading", { name: "Revisá tu mail" }),
  ).toBeVisible();
}

test("an email and its code sign in and land on home", async ({ page }) => {
  await askForCode(page, address("code"));
  await page.getByLabel("Código de 6 dígitos").fill(CODE);
  await page.waitForURL("**/es/home");
});

test("a wrong code says so and keeps the code step", async ({ page }) => {
  await askForCode(page, address("wrong"));
  await page.getByLabel("Código de 6 dígitos").fill("000000");
  await expect(
    page.getByRole("alert").filter({
      hasText: "Ese código no es. Revisalo o pedí otro.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Revisá tu mail" }),
  ).toBeVisible();
});

test("the link in the mail signs in the browser that asked", async ({
  page,
}) => {
  const email = address("link");
  await askForCode(page, email);
  const fragment = new URLSearchParams({ email, code: CODE }).toString();
  await page.goto(`/es/login/verify#${fragment}`);
  await page.waitForURL("**/es/home");
});

test("the link opened in another browser says where it works", async ({
  page,
  browser,
}) => {
  const email = address("other");
  await askForCode(page, email);

  const other = await browser.newContext();
  const elsewhere = await other.newPage();
  const fragment = new URLSearchParams({ email, code: CODE }).toString();
  await elsewhere.goto(`/es/login/verify#${fragment}`);
  await expect(
    elsewhere.getByRole("alert").filter({
      hasText: "Este link funciona en el navegador donde pediste el código",
    }),
  ).toBeVisible();
  // The code left the address bar as soon as it was read.
  expect(new URL(elsewhere.url()).hash).toBe("");
  await other.close();
});

test("Google comes back through the callback and lands on home", async ({
  page,
}) => {
  await page.goto("/es/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await page.waitForURL("**/es/home");
});

test("a signed-in visitor who opens login goes on to home", async ({
  page,
}) => {
  await askForCode(page, address("again"));
  await page.getByLabel("Código de 6 dígitos").fill(CODE);
  await page.waitForURL("**/es/home");
  await page.goto("/es/login");
  await page.waitForURL("**/es/home");
});

test("signup is the same screen", async ({ page }) => {
  await page.goto("/es/signup");
  await page.waitForURL("**/es/login");
  await expect(
    page.getByRole("button", { name: "Continuar con Google" }),
  ).toBeVisible();
});
