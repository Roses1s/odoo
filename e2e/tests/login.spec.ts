import { expect, test } from "@playwright/test";
import { mockApi } from "./api-mock";

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
