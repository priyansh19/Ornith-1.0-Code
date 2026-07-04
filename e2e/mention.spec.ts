import { test, expect, type Page } from "@playwright/test";

const sessionRow = (page: Page, title: string) =>
  page.locator(".lm-ses").filter({ hasText: title }).locator(".lm-ses__hit");
const composerInput = (page: Page) => page.locator(".lm-composer__input");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test.describe("@-mention", () => {
  test("typing @partial opens a filtered menu and Enter attaches a pill without sending", async ({
    page,
  }) => {
    const input = composerInput(page);
    await input.click();
    await input.pressSequentially("@ses");

    // menu is open, filtered to the two session.py paths
    const menu = page.locator(".lm-mention");
    await expect(menu).toBeVisible();
    const rows = page.locator(".lm-mention__row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("src/auth/session.py");
    await expect(rows.nth(1)).toContainText("tests/auth/test_session.py");

    // Enter selects the highlighted file instead of sending
    await input.press("Enter");
    await expect(page.locator(".lm-ctxpill")).toHaveCount(1);
    await expect(page.locator(".lm-ctxpill")).toContainText(
      "src/auth/session.py",
    );
    // the pill is the source of truth — no mention text left in the input
    await expect(input).not.toHaveValue(/@ses/);
    await expect(menu).toBeHidden();
    // and NO user bubble was sent
    await expect(page.locator(".lm-bubble--user")).toHaveCount(0);
  });

  test("ArrowDown moves the roving highlight", async ({ page }) => {
    const input = composerInput(page);
    await input.click();
    await input.pressSequentially("@");
    await expect(page.locator(".lm-mention")).toBeVisible();

    await expect(page.locator(".lm-mention__row.is-active")).toContainText(
      "src/auth/session.py",
    );
    await input.press("ArrowDown");
    await expect(page.locator(".lm-mention__row.is-active")).toContainText(
      "src/auth/tokens.py",
    );
  });

  test("Escape closes the mention menu, then Enter sends normally", async ({
    page,
  }) => {
    const input = composerInput(page);
    await input.click();
    await input.pressSequentially("@ses");
    await expect(page.locator(".lm-mention")).toBeVisible();

    await input.press("Escape");
    await expect(page.locator(".lm-mention")).toBeHidden();
    await expect(page.locator(".lm-ctxpill")).toHaveCount(0);

    await input.fill("Add a regression test for the refresh race");
    await input.press("Enter");
    await expect(page.locator(".lm-bubble--user")).toContainText(
      "Add a regression test for the refresh race",
    );
  });
});

test.describe("Busy lock take-over", () => {
  test("stealing the lock from a mid-run session warns, stops the run, and re-locks", async ({
    page,
  }) => {
    // s2 shares s1's folder; grab the lock while s1 is idle (plain take-over)
    await sessionRow(page, "Session token refresh").click();
    await page.getByRole("button", { name: "Workspace folder" }).click();
    await page.getByRole("button", { name: "Take over lock" }).click();
    await expect(page.locator(".lm-wsbtn--held")).toBeVisible();

    // start a background run in s2 (full-auto: no approval gate)
    await page.locator(".lm-composer__permsel select").selectOption("auto");
    const input = composerInput(page);
    await input.fill("Refactor the token refresh path");
    await input.press("Enter");
    await expect(page.locator(".lm-ses__live")).toHaveCount(1);

    // switch back to s1 — the run keeps going in the background
    await sessionRow(page, "Login race condition fix").click();
    await expect(page.locator(".lm-wsbtn--other")).toBeVisible();

    // the popover shows the mid-run warning + danger confirm
    await page.getByRole("button", { name: "Workspace folder" }).click();
    await expect(page.locator(".lm-ws__warn")).toContainText("mid-run");
    const steal = page.getByRole("button", {
      name: "Stop their run & take over",
    });
    await expect(steal).toBeVisible();
    await steal.click();

    // holder's run was stopped, s1 now holds the lock
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(
      page.locator(".lm-notif__row").filter({ hasText: /Stopped “/ }),
    ).toContainText("took the folder lock");
    await expect(page.locator(".lm-ses__live")).toHaveCount(0);
    await expect(page.locator(".lm-ws__status")).toContainText("locked");
    await expect(page.locator(".lm-wsbtn--held")).toBeVisible();
  });
});
