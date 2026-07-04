import { test, expect } from "@playwright/test";

/* Verifies the critique-agent finding: the Graph tab must NOT show the
   scripted fake node-walk for the live (`a2a`) harness. Fast test — doesn't
   need to wait for a real model turn to complete. */
test("Graph tab shows an honest message for the live harness, not a fake walk", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.locator(".lm-sidebar__top").getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("heading", { name: "Start a coding session" })).toBeVisible();
  await page.locator(".lm-hcard").filter({ hasText: "Agent-to-Agent" }).click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  await page.getByRole("tab", { name: "Graph" }).click();
  await expect(page.getByText(/runs live on the server/i)).toBeVisible();
  await expect(page.locator(".lm-g__svg")).toHaveCount(0);
});
