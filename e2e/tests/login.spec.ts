import { expect, test } from "@playwright/test";
import { LIVE, mockApi } from "./api-mock";

// These drive the interface against a stubbed API; the live suite covers the
// contract with the real backend.
test.skip(LIVE, "mocked scenarios do not apply to the live stack");

test("an anonymous visitor lands on the sign-in page", async ({ page }) => {
  await mockApi(page, { anonymous: true });

  await page.goto("/crm");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Вход в CRM")).toBeVisible();
});

test("signing in opens the application", async ({ page }) => {
  await mockApi(page, { anonymous: true });
  await page.goto("/login");

  await page.getByLabel("Email").fill("admin@crm.local");
  await page.getByLabel("Пароль").fill("secret");
  await page.getByRole("button", { name: /Войти/ }).click();

  await expect(page).not.toHaveURL(/\/login$/);
});
