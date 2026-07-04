import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test.describe("Keyboard support", () => {
  test("palette roving highlight runs the highlighted command on Enter", async ({
    page,
  }) => {
    test.setTimeout(90_000); // real Ollama load, not a cosmetic state flip
    await page.keyboard.press("Control+k");
    await expect(page.locator(".lm-cmd__box")).toBeVisible();

    const input = page.locator(".lm-cmd__input");
    await input.fill("gemma");
    await input.press("ArrowDown");
    await expect(page.locator(".lm-cmd__row.is-active")).toBeVisible();
    await expect(page.locator(".lm-cmd__row.is-active")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await input.press("Enter");
    await expect(page.locator(".lm-cmd__box")).toBeHidden();
    // Model picker lives in the composer now, not the topbar; this triggers
    // a real Ollama load, so give it a realistic amount of time.
    await expect(
      page.locator(".lm-composer__modelsel select"),
    ).toHaveValue("gemma4:latest", { timeout: 60_000 });
  });

  test("the models modal traps Tab focus", async ({ page }) => {
    await page.getByRole("button", { name: "Models" }).click();
    await expect(page.locator(".lm-modal")).toBeVisible();

    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
    }

    const inModal = await page.evaluate(
      () => !!document.activeElement?.closest(".lm-modal"),
    );
    expect(inModal).toBe(true);
  });

  test("\"]\" closes and reopens the right panel", async ({ page }) => {
    await expect(page.locator(".lm-right")).toHaveClass(/lm-right--open/);
    await page.keyboard.press("]");
    await expect(page.locator(".lm-right")).not.toHaveClass(/lm-right--open/);
    await page.keyboard.press("]");
    await expect(page.locator(".lm-right")).toHaveClass(/lm-right--open/);
  });

  test("the workspace popover closes on an outside click", async ({ page }) => {
    await page.getByRole("button", { name: "Workspace folder" }).click();
    await expect(page.locator(".lm-ws__menu")).toBeVisible();

    await page.locator(".lm-chat").click({ position: { x: 200, y: 200 } });
    await expect(page.locator(".lm-ws__menu")).toHaveCount(0);
  });
});
