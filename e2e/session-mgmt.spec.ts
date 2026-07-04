import { test, expect, type Page } from "@playwright/test";

const sessionRow = (page: Page, title: string) =>
  page.locator(".lm-ses").filter({ hasText: title });
const folderOf = (page: Page, name: string) =>
  page.locator(".lm-folder").filter({ hasText: name });
const menuItem = (page: Page, label: string | RegExp) =>
  page.locator(".lm-menu__item").filter({ hasText: label });

async function openSessionMenu(page: Page, title: string) {
  const row = sessionRow(page, title);
  await row.hover();
  await row.locator(".lm-ses__kebab").click();
  await expect(page.locator(".lm-menu").first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test.describe("Session & folder management", () => {
  test("kebab → Rename renames a session inline", async ({ page }) => {
    await openSessionMenu(page, "Scout dispatch refactor");
    await menuItem(page, /^Rename$/).click();

    const input = page.locator(".lm-ses .lm-rename");
    await expect(input).toBeVisible();
    await input.fill("Dispatch v2");
    await input.press("Enter");

    await expect(sessionRow(page, "Dispatch v2")).toBeVisible();
    await expect(sessionRow(page, "Scout dispatch refactor")).toHaveCount(0);
  });

  test("kebab → Move to folder puts the session in the folder", async ({
    page,
  }) => {
    const folder = folderOf(page, "Auth bugs");
    await expect(folder.locator(".lm-folder__count")).toHaveText("2");

    await openSessionMenu(page, "Scout dispatch refactor");
    await menuItem(page, "Move to folder").click();
    await page
      .locator(".lm-menu__sub .lm-menu__item")
      .filter({ hasText: "Auth bugs" })
      .click();

    await expect(folder.locator(".lm-folder__count")).toHaveText("3");
    await expect(
      folder.locator(".lm-ses").filter({ hasText: "Scout dispatch refactor" }),
    ).toBeVisible();
  });

  test("folder kebab → Delete removes the folder but keeps its sessions", async ({
    page,
  }) => {
    const folder = folderOf(page, "Design research");
    await folder.locator(".lm-folder__row").hover();
    await folder.locator(".lm-folder__kebab").click();

    // two-step confirm: first click flips the label, second deletes
    await menuItem(page, /^Delete folder$/).click();
    await menuItem(page, "Confirm delete?").click();

    await expect(folderOf(page, "Design research")).toHaveCount(0);
    const recent = page
      .locator(".lm-sesgroup")
      .filter({ has: page.locator(".lm-sesgroup__label", { hasText: "Recent" }) });
    await expect(
      recent.locator(".lm-ses").filter({ hasText: "Dark-mode dashboard" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText(
      "Folder removed — sessions kept",
    );
  });

  test("deleting the active session leaves the app usable", async ({ page }) => {
    // s1 ("Login race condition fix") is the active session on load
    await openSessionMenu(page, "Login race condition fix");
    await menuItem(page, /^Delete$/).click();
    await menuItem(page, "Confirm delete?").click();

    await expect(sessionRow(page, "Login race condition fix")).toHaveCount(0);
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText("Session deleted");
    // another session became active and the main pane is usable
    await expect(page.locator(".lm-ses--active")).toHaveCount(1);
    await expect(page.locator(".lm-main")).toBeVisible();
  });

  test("New folder button enters rename mode; Enter names it", async ({
    page,
  }) => {
    await page
      .locator(".lm-sidebar__top")
      .getByRole("button", { name: "New folder" })
      .click();

    const input = page.locator(".lm-folder .lm-rename");
    await expect(input).toBeVisible();
    await input.fill("Ops");
    await input.press("Enter");

    await expect(
      page.locator(".lm-folder__name", { hasText: "Ops" }),
    ).toBeVisible();
    await expect(page.locator(".lm-folder .lm-rename")).toHaveCount(0);
  });
});
