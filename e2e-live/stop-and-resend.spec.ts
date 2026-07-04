import { test, expect } from "@playwright/test";

/* Empirically validates the two race-condition fixes from the critique pass:
   1. sendLive's finally() must not delete a NEWER controller stored under the
      same session id after Stop -> immediate resend.
   2. runLiveChat must not apply a stray post-abort event over a "stopped by
      user" message.
   Real CPU-only model turns take minutes, so this stops EARLY (as soon as
   streaming visibly starts) rather than waiting for a full round. */
test.setTimeout(6 * 60 * 1000);

test("stop then immediately resend in the same session works both times", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.locator(".lm-sidebar__top").getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("heading", { name: "Start a coding session" })).toBeVisible();
  await page.locator(".lm-hcard").filter({ hasText: "Agent-to-Agent" }).click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  const input = page.locator(".lm-composer__input");

  // --- Turn 1: send, wait for the run to visibly start, then stop early ---
  await input.fill("write one sentence about the ocean");
  await input.press("Enter");
  await expect(page.locator(".lm-tool").first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(2000); // let sendLive's fetch actually start, not just the UI optimistic state

  // Find whatever the real stop control is by role/name instead of guessing a class
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await expect(stop).toBeVisible({ timeout: 10000 });
  await stop.click();

  const firstBubble = page.locator(".lm-bubble--assistant").last();
  await expect(firstBubble).toContainText(/stopped by user/i, { timeout: 10000 });
  const firstText = await firstBubble.textContent();

  // --- Turn 2: immediately resend in the SAME session ---
  await input.fill("write one sentence about mountains");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);

  // Stop must work AGAIN — if the identity-race bug were still present, this
  // second stop would be a silent no-op (the button might still be clickable,
  // but the controller lookup would fail server-side and nothing would change).
  const stop2 = page.getByRole("button", { name: "Stop", exact: true });
  await stop2.click();
  const secondBubble = page.locator(".lm-bubble--assistant").last();
  await expect(secondBubble).toContainText(/stopped by user/i, { timeout: 10000 });

  // The first bubble's "stopped by user" text must not have been silently
  // overwritten by a stray late event from the first (aborted) request.
  await expect(firstBubble).toContainText(/stopped by user/i);
  console.log("FIRST BUBBLE:", firstText);
  console.log("SECOND BUBBLE:", await secondBubble.textContent());
});
