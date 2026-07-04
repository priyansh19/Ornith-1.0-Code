import { test, expect } from "@playwright/test";

/* Every prior live test used a "no tools needed" prompt to keep turns short.
   This is the first to force an actual tool_result event through the real
   agent loop (agent/p4-agent-to-agent/tools.py's `calculator`), verifying the
   inline tool row renders the REAL tool name/input/result, not the mock's
   scripted "read/edit/run session.py" items. Two real rounds -> can take
   several minutes on this CPU-only box. */
test.setTimeout(10 * 60 * 1000);

test("a real tool_result event renders the real tool name and result", async ({ page }) => {
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
  await expect(assistantBubble).toContainText(/1{0,1}\d{7}/, { timeout: 9 * 60 * 1000 }); // 3847*2953=11361991, 8 digits

  const toolRow = page.locator(".lm-tool").first();
  await toolRow.locator(".lm-tool__sum").click(); // items are collapsed by default
  const toolText = await toolRow.innerText();
  console.log("TOOL ROW TEXT (expanded):", toolText);
  console.log("ASSISTANT REPLY:", await assistantBubble.textContent());

  // must reference the REAL tool, not the mock's scripted session.py file ops
  expect(toolText.toLowerCase()).toContain("calculator");
  expect(toolText).not.toContain("session.py");
});
