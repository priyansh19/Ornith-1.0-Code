import { test, expect } from "@playwright/test";

test.use({ permissions: ["clipboard-write"] });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
  // full-auto tier skips the approval gate so the reply lands immediately
  await page.locator(".lm-composer__permsel select").selectOption("auto");
  await page.locator(".lm-suggest").first().click();
  await expect(page.locator(".lm-bubble--assistant")).toBeVisible({
    timeout: 8000,
  });
});

test.describe("Markdown rendering", () => {
  test("assistant reply renders a fenced code block", async ({ page }) => {
    const pre = page.locator(".lm-md__pre").first();
    await expect(pre).toBeVisible();
    await expect(pre.locator("pre code")).toHaveCount(1);
    await expect(pre.locator("code")).toContainText("async def refresh");
    // language label parsed from the fence
    await expect(pre.locator(".lm-md__lang")).toHaveText("python");
  });

  test("the copy button copies and flips to Copied", async ({ page }) => {
    const copy = page.locator(".lm-md__copy").first();
    await expect(copy).toBeVisible();
    await expect(copy).toHaveText(/Copy/i);
    await copy.click();
    await expect(copy).toHaveText(/Copied/i);
    // and it settles back to Copy after ~1.5s
    await expect(copy).toHaveText(/^Copy$/i, { timeout: 4000 });
  });

  test("inline code renders as a chip", async ({ page }) => {
    const inline = page.locator(".lm-md__code").first();
    await expect(inline).toBeVisible();
    await expect(inline).toContainText("session.py");
  });
});
