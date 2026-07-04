import { test, expect } from "@playwright/test";

/* The calculator tool has a real bug (agent/p4-agent-to-agent/tools.py) that
   makes the agent retry an identical failing call for up to 10 rounds. This
   confirms the new client-side inactivity timeout in liveBackend.ts surfaces
   an honest error instead of hanging on "Processing..." forever — the same
   prompt that hung for 9+ minutes unbounded should now fail cleanly at ~5min. */
test.setTimeout(7 * 60 * 1000);

test("a stuck tool-retry loop times out honestly instead of hanging forever", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.locator(".lm-sidebar__top").getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("heading", { name: "Start a coding session" })).toBeVisible();
  await page.locator(".lm-hcard").filter({ hasText: "Agent-to-Agent" }).click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  const input = page.locator(".lm-composer__input");
  await input.fill("Use the calculator tool to compute 3847 * 2953, then tell me the result.");
  await input.press("Enter");

  const assistantBubble = page.locator(".lm-bubble--assistant").last();
  await expect(assistantBubble).toContainText(/no response from the agent/i, { timeout: 6 * 60 * 1000 });
  console.log("TIMEOUT MESSAGE SHOWN:", await assistantBubble.textContent());
});
