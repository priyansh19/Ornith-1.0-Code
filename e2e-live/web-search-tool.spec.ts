import { test, expect } from "@playwright/test";

/* Every prior real-tool test used `calculator`. This confirms the bridge
   correctly renders a DIFFERENT real tool (web_search) too — i.e. the
   inline tool-activity rendering is generic across tools, not something
   that happened to work only for calculator. */
test.setTimeout(10 * 60 * 1000);

test("web_search tool call renders correctly through the live bridge", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  await page.locator(".lm-sidebar__top").getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("heading", { name: "Start a coding session" })).toBeVisible();
  await page.locator(".lm-hcard").filter({ hasText: "Agent-to-Agent" }).click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  const input = page.locator(".lm-composer__input");
  await input.fill("Use the web_search tool to search for 'Ollama local LLM', then briefly summarize the top result.");
  await input.press("Enter");

  const assistantBubble = page.locator(".lm-bubble--assistant").last();
  await expect(assistantBubble).not.toContainText(/processing/i, { timeout: 9 * 60 * 1000 });

  const toolRow = page.locator(".lm-tool").first();
  await toolRow.locator(".lm-tool__sum").click();
  const toolText = await toolRow.innerText();
  console.log("TOOL ROW TEXT:", toolText);
  console.log("ASSISTANT REPLY:", await assistantBubble.textContent());

  expect(toolText.toLowerCase()).toContain("web_search");
});
