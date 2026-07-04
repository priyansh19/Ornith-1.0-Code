import { test, expect, type Page } from "@playwright/test";

/* Per-run trace history + varied scenario bank.
   Session s1 loads with one pre-baked race-fix run; each completed send
   appends another run and Trace/Critiques page through them. */

const fullAuto = (page: Page) =>
  page.locator(".lm-composer__permsel select").selectOption("auto");
const composer = (page: Page) => page.locator(".lm-composer__input");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test("a second prompt runs a different scenario with a distinct reply", async ({
  page,
}) => {
  await fullAuto(page);

  // run 1: the race-fix scenario
  await page.locator(".lm-suggest").first().click();
  const bubbles = page.locator(".lm-bubble--assistant .lm-bubble__text");
  await expect(bubbles.first()).toContainText("Routed through the harness", {
    timeout: 8000,
  });
  // wait for run 1 to finish streaming (perf strip renders only on completion)
  // so the next send isn't blocked by the still-running session
  await expect(page.locator(".lm-perf").first()).toBeVisible({ timeout: 8000 });
  const first = await bubbles.first().innerText();

  // run 2: keyword-matched to the add-test scenario
  await composer(page).fill("Add a test for the race");
  await composer(page).press("Enter");
  await expect(bubbles).toHaveCount(2, { timeout: 8000 });
  await expect(bubbles.nth(1)).toContainText("Regression test written", {
    timeout: 8000,
  });

  const second = await bubbles.nth(1).innerText();
  expect(second).not.toEqual(first);
});

test("the Trace pager pages between the seeded run and a new run", async ({
  page,
}) => {
  await fullAuto(page);

  // s1 already has the seeded race-fix run; this send appends an add-test run
  await composer(page).fill("Add a test for the race");
  await composer(page).press("Enter");
  await expect(
    page.locator(".lm-bubble--assistant .lm-bubble__text"),
  ).toContainText("Regression test written", { timeout: 8000 });

  await page.getByRole("tab", { name: "Trace" }).click();
  const tracePanel = page.getByRole("tabpanel", { name: "Trace" });

  // latest run (2 of 2) shows the add-test spans
  await expect(tracePanel.locator(".lm-runpager__label")).toContainText("2 of 2");
  await expect(
    tracePanel.locator(".lm-tr__main", { hasText: "write regression test" }),
  ).toBeVisible();

  // page back to run 1 — the race-fix spans swap in
  await tracePanel.getByRole("button", { name: "Previous run" }).click();
  await expect(tracePanel.locator(".lm-runpager__label")).toContainText("1 of 2");
  await expect(
    tracePanel.locator(".lm-tr__main", { hasText: "plan searches" }),
  ).toBeVisible();
  await expect(
    tracePanel.locator(".lm-tr__main", { hasText: "write regression test" }),
  ).toHaveCount(0);

  // and forward again
  await tracePanel.getByRole("button", { name: "Next run" }).click();
  await expect(tracePanel.locator(".lm-runpager__label")).toContainText("2 of 2");
});

test("a fresh session shows the Trace empty state", async ({ page }) => {
  await page
    .locator(".lm-sidebar__top")
    .getByRole("button", { name: "New session" })
    .click();

  // pre-flight: pick the first loaded harness for the default directory
  await page.locator(".lm-hcard:not(.lm-hcard--more)").first().click();
  await expect(page.getByText(/harness ready\./)).toBeVisible();

  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.locator(".lm-right__body")).toContainText(
    "Run the harness to capture a trace.",
  );
  await expect(page.locator(".lm-runpager")).toHaveCount(0);
  await expect(page.locator(".lm-tr__row")).toHaveCount(0);
});
