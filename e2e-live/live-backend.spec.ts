import { test, expect } from "@playwright/test";

/* Live-backend smoke test — drives the REAL app against the REAL FastAPI
   server (agent/p4-agent-to-agent via Ollama), not the scripted mock. Requires
   `npm run dev` on :3000, the FastAPI server on :8000, and Ollama running.
   Local CPU-only inference for a 9B model can take several minutes per turn,
   hence the long timeout. */

test.setTimeout(10 * 60 * 1000);

test("a2a harness streams a real reply from the live backend", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.locator(".lm-sidebar__top").getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("heading", { name: "Start a coding session" })).toBeVisible();

  await page.locator(".lm-hcard").filter({ hasText: "Agent-to-Agent" }).click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  const input = page.locator(".lm-composer__input");
  await input.fill("what is 2+2? just answer directly, no tools needed.");
  await input.press("Enter");

  // real inline tool row should show live round/thought text, not the mock's
  // scripted "Applied session.py, read a file, ran a tool" summary
  await expect(page.locator(".lm-tool").first()).toBeVisible();

  const assistantBubble = page.locator(".lm-bubble--assistant").last();
  await expect(assistantBubble).toContainText(/4/, { timeout: 9 * 60 * 1000 });
  const text = await assistantBubble.textContent();
  console.log("LIVE ASSISTANT REPLY:", text);
  expect(text).not.toContain("token-refresh path");
});
