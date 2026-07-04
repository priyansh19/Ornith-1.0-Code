import { test, expect } from "@playwright/test";

test("Workspace tab shows an honest unreachable state, not fake data", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.getByRole("tab", { name: "Workspace" }).click();
  await expect(page.getByText(/couldn't reach/i)).toBeVisible();

  // Refresh must actually re-fetch, not just spin forever or no-op
  const refreshButtons = page.locator(".lm-ws").getByRole("button", { name: "Refresh", exact: true });
  await expect(refreshButtons).toHaveCount(1);
  await refreshButtons.first().click();
  await expect(page.getByText(/couldn't reach/i)).toBeVisible();
});
