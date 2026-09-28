import { expect, test } from "@playwright/test";
import { mockApi } from "./api-mock";

test("dark mode survives a reload and applies before the page is drawn", async ({ page }) => {
  await mockApi(page);
  await page.goto("/crm");

  await page.getByTitle("admin@crm.local").click();
  await page.getByRole("switch", { name: "Тёмный режим" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();

  // Applied by the pre-paint script, not by React, so it is already there.
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe("dark");
});
