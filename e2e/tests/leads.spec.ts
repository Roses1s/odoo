import { expect, test } from "@playwright/test";
import { LIVE, mockApi } from "./api-mock";

// These drive the interface against a stubbed API; the live suite covers the
// contract with the real backend.
test.skip(LIVE, "mocked scenarios do not apply to the live stack");

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("the board shows the stages and their cards", async ({ page }) => {
  await page.goto("/crm");

  await expect(page.getByText("Не дозвонились")).toBeVisible();
  await expect(page.getByText('ООО ТД "АВТОСНАБ-УРАЛ" — 7707083893')).toBeVisible();
});

test("the list view shows the lead columns", async ({ page }) => {
  await page.goto("/crm?view=list");

  await expect(page.getByRole("columnheader", { name: "Ответственный" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Ожидаемая выручка" })).toHaveCount(0);
  await expect(page.getByText("Иван Костылев").first()).toBeVisible();
});

test("opening a lead shows its card and chatter", async ({ page }) => {
  await page.goto("/crm?view=list");
  await page.getByText('ООО ТД "АВТОСНАБ-УРАЛ"').first().click();

  await expect(page).toHaveURL(/\/crm\/leads\/1$/);
  await expect(page.getByLabel("Название лида")).toHaveValue('ООО ТД "АВТОСНАБ-УРАЛ"');
  await expect(page.getByText("(Этапы лидов)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Лог примечания" })).toBeVisible();
});

test("editing a field offers to save and sends the change", async ({ page }) => {
  const writes: { method: string; url: string; payload: unknown }[] = [];
  await mockApi(page, { onWrite: (method, url, payload) => writes.push({ method, url, payload }) });

  await page.goto("/crm/leads/1");
  await expect(page.getByLabel("Сохранить")).toHaveCount(0);

  await page.getByLabel("КПП").fill("743001001");
  await expect(page.getByLabel("Сохранить")).toBeVisible();
  await page.getByLabel("Сохранить").click();

  await expect
    .poll(() => writes.find((w) => w.method === "PATCH")?.url)
    .toBe("/crm/leads/1/");
  const patch = writes.find((w) => w.method === "PATCH")!.payload as Record<string, unknown>;
  expect(patch.kpp).toBe("743001001");
});

test("a runtime failure does not leave a blank page", async ({ page }) => {
  await page.route("**/api/crm/stages/", (route) => route.abort("failed"));

  await page.goto("/crm");

  // Either the screen renders without stages or the boundary explains itself,
  // but the page must never be empty.
  await expect(page.locator("body")).not.toBeEmpty();
});
