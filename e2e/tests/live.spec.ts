import { expect, test } from "@playwright/test";
import { LIVE } from "./api-mock";

/**
 * Runs against the assembled stack: real backend, real database, seeded users.
 *
 * The mocked suite proves the interface behaves; this one proves the interface
 * and the API still agree — the class of breakage a stubbed run cannot see.
 */
test.skip(!LIVE, "requires the full stack (E2E_LIVE=1)");

const ADMIN = { email: "admin@crm.local", password: process.env.DEMO_ADMIN_PASSWORD ?? "ci-admin-password" };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Пароль").fill(ADMIN.password);
  await page.getByRole("button", { name: /Войти/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test("a seeded user signs in and sees the seeded stages", async ({ page }) => {
  await signIn(page);
  await page.goto("/crm");

  // Stage names come from seed_crm.
  await expect(page.getByText("Не дозвонились").first()).toBeVisible();
  await expect(page.getByText("ЛПР").first()).toBeVisible();
});

test("a lead created through the interface comes back from the API", async ({ page }) => {
  await signIn(page);
  await page.goto("/crm");

  const name = `E2E ООО ${Date.now()}`;
  await page.getByTitle("Добавить лид").first().click();
  await page.getByPlaceholder("Название").fill(name);
  // Valid tax-office checksum: the backend rejects anything else.
  await page.getByPlaceholder("ИНН").fill("7707083893");
  await page.getByRole("button", { name: "Добавить" }).click();

  await expect(page.getByText(name)).toBeVisible();

  // Reload so the card has to come back from the database, not from state.
  await page.reload();
  await expect(page.getByText(name)).toBeVisible();
});

test("an invalid INN is refused and nothing is stored", async ({ page }) => {
  await signIn(page);
  await page.goto("/crm");

  await page.getByTitle("Добавить лид").first().click();
  await page.getByPlaceholder("Название").fill("E2E неверный ИНН");
  await page.getByPlaceholder("ИНН").fill("1234567890");
  await page.getByRole("button", { name: "Добавить" }).click();

  await expect(page.getByText("Проверьте ИНН")).toBeVisible();

  // The card must not appear after a reload either: nothing reached the API.
  await page.reload();
  await expect(page.getByText("E2E неверный ИНН")).toHaveCount(0);
});

test("the deep health probe reports the database and backup state", async ({ request }) => {
  const res = await request.get("/api/health/?deep=1");
  const body = await res.json();

  expect(body.db).toBe("ok");
  // No backup has been taken in CI, so the probe must say so rather than lie.
  expect(body).toHaveProperty("backup_ok");
  expect(body).toHaveProperty("backup_age_hours");
});
