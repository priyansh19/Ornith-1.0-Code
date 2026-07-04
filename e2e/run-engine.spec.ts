import { test, expect, type Page } from "@playwright/test";

const sessionRow = (page: Page, title: string) =>
  page.locator(".lm-ses").filter({ hasText: title }).locator(".lm-ses__hit");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test.describe("Run engine", () => {
  test("a run survives switching sessions away and back, then completes", async ({
    page,
  }) => {
    // full-auto so no approval gate interrupts the background run
    await page.locator(".lm-composer__permsel select").selectOption("auto");
    await page.locator(".lm-suggest").first().click();

    // immediately hop to another session and back while the run is in flight
    await sessionRow(page, "Session token refresh").click();
    await sessionRow(page, "Login race condition fix").click();

    // the run kept going in the background and completes normally
    await expect(page.locator(".lm-bubble--assistant")).toContainText(
      "Routed through the harness",
      { timeout: 10000 },
    );
    await expect(page.locator(".lm-perf")).toBeVisible({ timeout: 10000 });

    // no stuck spinner, and the composer ends up usable again
    await expect(page.locator(".lm-tool__spin")).toHaveCount(0);
    await expect(page.locator(".lm-composer__input")).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Send", exact: true }),
    ).toBeVisible();
  });

  test("Stop during streaming keeps the partial text and re-enables the composer", async ({
    page,
  }) => {
    await page.locator(".lm-composer__permsel select").selectOption("auto");
    await page.locator(".lm-suggest").first().click();

    // park the pointer on the Stop button while the graph is still walking…
    const stop = page.getByRole("button", { name: "Stop", exact: true });
    await stop.hover();

    // …and fire the instant partial reply text starts streaming in
    const bubble = page.locator(".lm-bubble--assistant").last();
    await expect(bubble).toContainText("Routed", { timeout: 10000 });
    await page.mouse.down();
    await page.mouse.up();

    await expect(bubble).toContainText("stopped by user");
    await expect(bubble).toContainText("Routed"); // partial text kept
    await expect(page.locator(".lm-tool__spin")).toHaveCount(0);
    await expect(page.locator(".lm-composer__input")).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Send", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText("Run stopped");
  });

  test("Escape in the focused composer stops an in-flight run", async ({
    page,
  }) => {
    await page.locator(".lm-composer__permsel select").selectOption("auto");
    await page.locator(".lm-suggest").first().click();

    // the run is in flight — focus the composer and hit Escape
    await expect(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toBeVisible();
    await page.locator(".lm-composer__input").click();
    await page.keyboard.press("Escape");

    await expect(page.locator(".lm-bubble--assistant").last()).toContainText(
      "stopped by user",
      { timeout: 5000 },
    );
    await expect(page.locator(".lm-tool__spin")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".lm-composer__input")).toBeEnabled();
  });
});
