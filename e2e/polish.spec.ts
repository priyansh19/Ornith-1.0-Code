import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test.describe("Settings tabs", () => {
  test("opens with Provider + General tabs; compact density applies to the app root", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    const modal = page.locator(".lm-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("tab", { name: "Provider" })).toBeVisible();
    await expect(modal.getByRole("tab", { name: "General" })).toBeVisible();

    // Provider content is the default tab
    await expect(modal.locator(".lm-provider__url input")).toBeVisible();

    await modal.getByRole("tab", { name: "General" }).click();
    await expect(modal.getByText("Density")).toBeVisible();

    await modal.getByRole("tab", { name: "compact" }).click();
    await expect(page.locator(".lm-app")).toHaveAttribute(
      "data-density",
      "compact",
    );
  });
});

test.describe("Platform-aware shortcut labels", () => {
  test("the search chip shows the non-Mac shortcut on Linux", async ({
    page,
  }) => {
    await expect(page.locator(".lm-kchip kbd")).toContainText("Ctrl");
  });
});

test.describe("Live timestamps", () => {
  test("session rows show a relative time label", async ({ page }) => {
    await expect(page.locator(".lm-ses__when").first()).toHaveText(
      /now|\d+m|\d+h|Mon|Tue|Wed|Thu|Fri|Sat|Sun/,
    );
  });
});

test.describe("Composer microcopy", () => {
  test("the mode selector exposes the permission tiers", async ({ page }) => {
    // The composer toolbar carries the permission-tier selector (styled as a
    // brand mode pill). It defaults to "Ask" and can switch to "Full-auto".
    const select = page.locator(".lm-composer__permsel select");
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toContainText([
      "Ask",
      "Full-auto",
    ]);
  });
});
