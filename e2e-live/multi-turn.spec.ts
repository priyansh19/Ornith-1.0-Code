import { test, expect } from "@playwright/test";

/* Central to "should work like Claude Code": does conversation context
   actually persist across turns? Send a number, then reference it without
   repeating it — only passes if the backend session_id correctly carries
   the same message history across two separate /chat-stream calls. */
test.setTimeout(12 * 60 * 1000);

test("a second message in the same session has the first message's context", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.locator(".lm-sidebar__top").getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("heading", { name: "Start a coding session" })).toBeVisible();
  await page.locator(".lm-hcard").filter({ hasText: "Agent-to-Agent" }).click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  const input = page.locator(".lm-composer__input");
  const assistantBubbles = page.locator(".lm-bubble--assistant");

  await input.fill("Remember the number 42. Just reply confirming you'll remember it, no tools needed.");
  await input.press("Enter");
  await expect(assistantBubbles.nth(0)).not.toContainText("Processing", { timeout: 9 * 60 * 1000 });
  await page.waitForTimeout(500);
  const firstReply = await assistantBubbles.nth(0).textContent();
  console.log("TURN 1 REPLY:", firstReply);

  await input.fill("What number did I just ask you to remember? Just answer directly, no tools needed.");
  await input.press("Enter");
  await expect(assistantBubbles.nth(1)).not.toContainText("Processing", { timeout: 9 * 60 * 1000 });
  const secondReply = await assistantBubbles.nth(1).textContent();
  console.log("TURN 2 REPLY:", secondReply);

  expect(secondReply).toMatch(/42/);
});
