import { test, expect, type Page } from "@playwright/test";

const harnessSelect = (page: Page) =>
  page.locator(".lm-picker__select--harness select");
const sidebarTop = (page: Page) => page.locator(".lm-sidebar__top");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();
});

test.describe("Initial render", () => {
  test("shows chrome, sidebar nav, ready chat, and inspector", async ({
    page,
  }) => {
    await expect(page.locator(".lm-wordmark")).toHaveText("LMChat");

    // default session (s1) is bound to the Research + Critic harness
    await expect(harnessSelect(page)).toHaveValue("research");

    // folder nav + recent group
    await expect(
      page.locator(".lm-folder").filter({ hasText: "Auth bugs" }),
    ).toBeVisible();
    await expect(
      page.locator(".lm-folder").filter({ hasText: "Design research" }),
    ).toBeVisible();
    await expect(page.getByText("Recent")).toBeVisible();

    // ready empty state + composer
    await expect(page.getByText(/harness ready\./)).toBeVisible();
    await expect(page.locator(".lm-composer__input")).toBeVisible();

    // right panel inspector reflects the session
    await expect(
      page.getByRole("tab", { name: "Inspector" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".lm-insp")).toContainText(
      "~/projects/mach2-harness",
    );
    await expect(page.locator(".lm-insp")).toContainText(
      "http://localhost:11434",
    );
  });
});

test.describe("Conversation flow", () => {
  test("a suggestion streams a tool row, an assistant reply, and a trace", async ({
    page,
  }) => {
    await page.locator(".lm-suggest").first().click();

    // user message
    await expect(page.locator(".lm-bubble--user")).toContainText(
      "Fix the login race condition",
    );

    // right panel auto-switches to the live harness Graph
    await expect(page.getByRole("tab", { name: "Graph" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".lm-g__svg")).toBeVisible();

    // diff-first: approve the proposed write, then the reply lands
    await page.getByRole("button", { name: /Approve/ }).click();
    await expect(page.locator(".lm-bubble--assistant")).toContainText(
      "Routed through the harness",
      { timeout: 8000 },
    );

    // Trace tab renders the unified span tree
    await page.getByRole("tab", { name: "Trace" }).click();
    await expect(page.locator(".lm-tr__row").first()).toBeVisible();

    // inspector flips to the done state
    await page.getByRole("tab", { name: "Inspector" }).click();
    await expect(page.locator(".lm-insp")).toContainText("Session id");
    await expect(page.locator(".lm-insp")).toContainText("Agents");
  });

  test("the live harness Graph runs and completes, and a perf strip appears", async ({
    page,
  }) => {
    await page.locator(".lm-suggest").first().click();

    // the graph is on-screen with the Research+Critic nodes
    await expect(page.locator(".lm-g__svg")).toBeVisible();
    await expect(page.locator(".lm-g__node")).toHaveCount(5);

    // it reaches the done state
    await expect(page.locator(".lm-g__badge--done")).toBeVisible({
      timeout: 8000,
    });

    // approve the write, then the assistant message carries a perf strip
    await page.getByRole("button", { name: /Approve/ }).click();
    await expect(page.locator(".lm-perf")).toBeVisible();
    await expect(page.locator(".lm-perf")).toContainText("tok/s");
    await expect(page.locator(".lm-perf")).toContainText("TTFT");
  });

  test("the inline tool row expands to its steps", async ({ page }) => {
    await page.locator(".lm-suggest").first().click();
    await page.getByRole("button", { name: /Approve/ }).click();
    await expect(page.locator(".lm-bubble--assistant")).toBeVisible({
      timeout: 8000,
    });

    const tool = page.locator(".lm-tool").first();
    await tool.locator(".lm-tool__sum").click();
    await expect(tool.locator(".lm-tool__item")).toHaveCount(3);
    await expect(tool).toContainText("src/auth/session.py");
    await expect(tool).toContainText("pytest tests/auth -q");
  });

  test("composer sends on Enter", async ({ page }) => {
    const input = page.locator(".lm-composer__input");
    await input.fill("Add a test for concurrent token refresh");
    await input.press("Enter");
    await expect(page.locator(".lm-bubble--user")).toContainText(
      "Add a test for concurrent token refresh",
    );
  });

  test("clearing a session empties the conversation", async ({ page }) => {
    await page.locator(".lm-suggest").first().click();
    await page.getByRole("button", { name: /Approve/ }).click();
    await expect(page.locator(".lm-bubble--assistant")).toBeVisible({
      timeout: 8000,
    });

    await page.getByRole("button", { name: "Clear session" }).click();
    await expect(page.locator(".lm-bubble--user")).toHaveCount(0);
    await expect(page.getByText(/harness ready\./)).toBeVisible();
  });
});

test.describe("Right panel", () => {
  test("Critiques tab shows the ledger for a multi-agent harness", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Critiques/ }).click();
    await expect(page.locator(".lm-crit")).toHaveCount(5);
    await expect(page.locator(".lm-crit").first()).toContainText(
      "Recommendation cites a source URL",
    );
    // the efficiency critique is marked resolved
    await expect(page.locator(".lm-crit--resolved")).toHaveCount(1);
  });

  test("a single-agent harness has no critic layers", async ({ page }) => {
    await harnessSelect(page).selectOption("agent-base");
    await page.getByRole("tab", { name: /Critiques/ }).click();
    await expect(page.locator(".lm-right__body")).toContainText("single agent");
    await expect(page.locator(".lm-crit")).toHaveCount(0);
  });

  test("the panel can be hidden and reopened", async ({ page }) => {
    await expect(page.locator(".lm-right")).toHaveClass(/lm-right--open/);
    await page.getByRole("button", { name: "Hide panel" }).click();
    await expect(page.locator(".lm-right")).not.toHaveClass(/lm-right--open/);
    await page.getByRole("button", { name: /Details/ }).click();
    await expect(page.locator(".lm-right")).toHaveClass(/lm-right--open/);
  });
});

test.describe("Sessions & folders", () => {
  test("switching sessions loads that session's harness", async ({ page }) => {
    await page
      .locator(".lm-ses")
      .filter({ hasText: "Critique ledger explained" })
      .click();
    await expect(harnessSelect(page)).toHaveValue("agent-base");

    await page
      .locator(".lm-ses")
      .filter({ hasText: "Session token refresh" })
      .click();
    await expect(harnessSelect(page)).toHaveValue("harness");
  });

  test("folders collapse and expand", async ({ page }) => {
    const folder = page.locator(".lm-folder").filter({ hasText: "Auth bugs" });
    await expect(folder.locator(".lm-ses")).toHaveCount(2);
    await folder.locator(".lm-folder__head").click();
    await expect(folder.locator(".lm-ses")).toHaveCount(0);
    await folder.locator(".lm-folder__head").click();
    await expect(folder.locator(".lm-ses")).toHaveCount(2);
  });

  test("creating a folder adds it to the sidebar", async ({ page }) => {
    const before = await page.locator(".lm-folder").count();
    await sidebarTop(page).getByRole("button", { name: "New folder" }).click();
    await expect(page.locator(".lm-folder")).toHaveCount(before + 1);
    // the new folder opens straight into inline-rename mode
    const rename = page.locator(".lm-folder .lm-rename");
    await expect(rename).toBeVisible();
    await rename.fill("Ops");
    await rename.press("Enter");
    await expect(
      page.locator(".lm-folder__name", { hasText: "Ops" }),
    ).toBeVisible();
  });
});

test.describe("New-session pre-flight", () => {
  test("new session shows the pre-flight, and picking a harness opens the chat", async ({
    page,
  }) => {
    await sidebarTop(page).getByRole("button", { name: "New session" }).click();

    // harness picker becomes "Not selected"; main shows the pre-flight
    await expect(page.locator(".lm-picker__empty")).toHaveText("Not selected");
    await expect(
      page.getByRole("heading", { name: "Start a coding session" }),
    ).toBeVisible();
    await expect(page.locator(".lm-pick__dir input")).toHaveValue(
      "~/projects/mach2-harness",
    );

    // 3 loaded harness cards (+ the "browse all" card)
    await expect(
      page.locator(".lm-hcard:not(.lm-hcard--more)"),
    ).toHaveCount(3);

    await page.locator(".lm-hcard:not(.lm-hcard--more)").first().click();
    await expect(page.getByText(/harness ready\./)).toBeVisible();
    await expect(harnessSelect(page)).toHaveValue("agent-base");
  });
});

test.describe("Harnesses server panel", () => {
  test("lists harnesses and toggles a load state", async ({ page }) => {
    await page.getByRole("button", { name: "Harnesses" }).click();
    const modal = page.locator(".lm-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".lm-hrow")).toHaveCount(5);
    await expect(modal).toContainText("3 of 5 loaded");

    // load an available harness -> count goes to 4
    // (Agent-to-Agent is the one harness actually live on the server, so it
    // starts loaded — toggle Memory Harness instead, which is still a stub.)
    await modal
      .locator(".lm-hrow")
      .filter({ hasText: "Memory Harness" })
      .locator(".lm-switch")
      .click();
    await expect(modal).toContainText("4 of 5 loaded");

    await modal.getByRole("button", { name: "Done" }).click();
    await expect(modal).toBeHidden();
  });
});

test.describe("Settings (Ollama provider)", () => {
  test("saving a new base URL updates the inspector", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    const modal = page.locator(".lm-modal");
    await expect(modal).toContainText("Model provider");

    const url = modal.locator(".lm-provider__url input");
    await expect(url).toHaveValue("http://localhost:11434");
    await url.fill("http://192.168.1.50:11434");
    await modal.getByRole("button", { name: "Save" }).click();
    await expect(modal).toBeHidden();

    await expect(page.locator(".lm-insp")).toContainText(
      "http://192.168.1.50:11434",
    );
  });

  test("the URL resets to the provider default when reopened without saving", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    const modal = page.locator(".lm-modal");
    await modal.locator(".lm-provider__url input").fill("http://scratch:1");
    await modal.getByRole("button", { name: "Done" }).click();
    await expect(modal).toBeHidden();

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.locator(".lm-provider__url input")).toHaveValue(
      "http://localhost:11434",
    );
  });
});

test.describe("Observability", () => {
  test("the Trace tab shows a span tree and a tool diff", async ({ page }) => {
    await page.getByRole("tab", { name: "Trace" }).click();
    await expect(page.locator(".lm-tr__row").first()).toBeVisible();
    // expand the edit_file tool span to reveal a before/after diff
    await page.locator(".lm-tr__main", { hasText: "edit_file" }).click();
    await expect(page.locator(".lm-tr__diffbody")).toBeVisible();
    await expect(page.locator(".lm-tr__add").first()).toBeVisible();
  });

  test("clicking a critique jumps to its span in the Trace", async ({ page }) => {
    await page.getByRole("tab", { name: /Critiques/ }).click();
    await page.locator(".lm-crit").first().click();
    await expect(page.getByRole("tab", { name: "Trace" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".lm-tr__row.is-focus")).toBeVisible();
  });

  test("the critique severity filter hides items", async ({ page }) => {
    await page.getByRole("tab", { name: /Critiques/ }).click();
    await expect(page.locator(".lm-crit")).toHaveCount(5);
    await page.getByRole("button", { name: "blocker" }).click();
    await expect(page.locator(".lm-crit")).toHaveCount(4);
  });
});

test.describe("Safety (approvals)", () => {
  test("rejecting a proposed edit leaves the file unchanged", async ({ page }) => {
    await page.locator(".lm-suggest").first().click();
    await page.getByRole("button", { name: /Reject/ }).click();
    await expect(page.locator(".lm-appr--rejected")).toBeVisible();
    await expect(page.locator(".lm-bubble--assistant")).toContainText("unchanged");
  });

  test("full-auto tier skips the approval gate", async ({ page }) => {
    await page.locator(".lm-composer__permsel select").selectOption("auto");
    await page.locator(".lm-suggest").first().click();
    await expect(page.locator(".lm-bubble--assistant")).toContainText(
      "Routed through the harness",
      { timeout: 8000 },
    );
    await expect(page.locator(".lm-appr")).toHaveCount(0);
  });
});

test.describe("Context, models, palette, org", () => {
  test("attaching a context file adds a pill", async ({ page }) => {
    await page.getByRole("button", { name: "Add context" }).click();
    await page.locator(".lm-ctxmenu__row").first().click();
    await expect(page.locator(".lm-ctxpill")).toHaveCount(1);
  });

  test("the inspector shows a context budget meter", async ({ page }) => {
    await page.getByRole("tab", { name: "Inspector" }).click();
    await expect(page.locator(".lm-ctx__bar")).toBeVisible();
    await expect(page.locator(".lm-insp")).toContainText("tokens");
  });

  test("the harness config tab (in Settings) renders params", async ({ page }) => {
    await page.getByRole("button", { name: "Configure harness" }).click();
    await expect(page.locator(".lm-modal__title")).toContainText("Settings");
    await expect(page.getByRole("tab", { name: "Harness" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".lm-cfg__row").first()).toBeVisible();
    await expect(
      page.getByText("Structured output (JSON schema)"),
    ).toBeVisible();
  });

  test("the models modal shows the library with fit badges", async ({ page }) => {
    await page.getByRole("button", { name: "Models" }).click();
    await expect(page.locator(".lm-mdl__row").first()).toBeVisible();
    await expect(page.locator(".lm-mdl__fit").first()).toBeVisible();
    await expect(page.getByText("VRAM spill")).toBeVisible();
  });

  test("the harnesses panel shows server health and a traceback", async ({ page }) => {
    await page.getByRole("button", { name: "Harnesses" }).click();
    await expect(page.locator(".lm-srv")).toContainText("python 3.12.4");
    await page.locator(".lm-hrow__errbtn").click();
    await expect(page.locator(".lm-hrow__trace")).toContainText("ImportError");
  });

  test("the command palette switches the model", async ({ page }) => {
    test.setTimeout(90_000); // real Ollama load, not a cosmetic state flip
    await page.keyboard.press("Control+k");
    await expect(page.locator(".lm-cmd__box")).toBeVisible();
    // Both the palette's "Switch model" list and the composer's dropdown now
    // source from Ollama's real installed models (falling back to a static
    // list only until that fetch resolves) — "gemma4" matches a model that's
    // actually pulled, unlike the old hardcoded "qwen3:8b" which isn't.
    await page.locator(".lm-cmd__input").fill("gemma4:latest");
    await page.locator(".lm-cmd__row").first().click();
    // Model picker lives in the composer now, not the topbar. This now
    // triggers a REAL Ollama load (not a cosmetic state flip), so give it a
    // realistic amount of time to actually swap the resident model.
    await expect(
      page.locator(".lm-composer__modelsel select"),
    ).toHaveValue("gemma4:latest", { timeout: 60_000 });
  });

  test("sidebar search filters sessions", async ({ page }) => {
    await page.locator(".lm-sidebar__filters input").fill("dark-mode");
    await expect(page.locator(".lm-ses")).toHaveCount(1);
    await expect(page.locator(".lm-ses")).toContainText("Dark-mode dashboard");
  });

  test("pinning a session moves it to the Pinned group", async ({ page }) => {
    await page
      .locator(".lm-ses")
      .filter({ hasText: "Session token refresh" })
      .locator(".lm-ses__pin")
      .click();
    await expect(
      page.locator(".lm-sesgroup__label", { hasText: "Pinned" }),
    ).toBeVisible();
  });
});

test.describe("UX polish", () => {
  test("Escape closes the models modal", async ({ page }) => {
    await page.getByRole("button", { name: "Models" }).click();
    await expect(page.locator(".lm-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".lm-modal")).toBeHidden();
  });

  test("the composer is blocked while an approval is pending", async ({
    page,
  }) => {
    await page.locator(".lm-suggest").first().click();
    await expect(page.getByRole("button", { name: /Approve/ })).toBeVisible({
      timeout: 8000,
    });
    await expect(page.locator(".lm-composer__input")).toBeDisabled();
    await expect(page.locator(".lm-composer__blocked")).toContainText(
      "approval pending",
    );
    await page.getByRole("button", { name: /Approve/ }).click();
    await expect(page.locator(".lm-composer__input")).toBeEnabled();
  });

  test("saving the harness config shows a notification", async ({ page }) => {
    await page.getByRole("button", { name: "Configure harness" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText(
      "Harness config saved",
    );
  });

  test("the ⌘K chip opens the command palette", async ({ page }) => {
    await page.getByRole("button", { name: "Open command palette" }).click();
    await expect(page.locator(".lm-cmd__box")).toBeVisible();
  });

  test("the help modal lists shortcuts", async ({ page }) => {
    await page.getByRole("button", { name: "Help" }).click();
    await expect(page.locator(".lm-modal__title")).toContainText(
      "Help & shortcuts",
    );
    await expect(page.getByText("Open command palette")).toBeVisible();
  });
});

test.describe("Workspace lock", () => {
  test("the lock button shows the locked working folder", async ({ page }) => {
    await expect(page.locator(".lm-wsbtn--held")).toBeVisible();
    await page.getByRole("button", { name: "Workspace folder" }).click();
    await expect(page.locator(".lm-ws__path")).toContainText("mach2-harness");
    await expect(page.locator(".lm-ws__status")).toContainText("locked");
  });

  test("a session sharing the folder shows held-by and can take over", async ({
    page,
  }) => {
    await page
      .locator(".lm-ses")
      .filter({ hasText: "Session token refresh" })
      .locator(".lm-ses__hit")
      .click();
    await expect(page.locator(".lm-wsbtn--other")).toBeVisible();
    await page.getByRole("button", { name: "Workspace folder" }).click();
    await expect(page.locator(".lm-ws__status")).toContainText("held by");
    await page.getByRole("button", { name: "Take over lock" }).click();
    await expect(page.locator(".lm-wsbtn--held")).toBeVisible();
    await expect(page.locator(".lm-ws__status")).toContainText("locked");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText("Took over");
  });

  test("sending is blocked without the folder lock", async ({ page }) => {
    await page
      .locator(".lm-ses")
      .filter({ hasText: "Session token refresh" })
      .locator(".lm-ses__hit")
      .click();
    const input = page.locator(".lm-composer__input");
    await input.fill("try to run without the lock");
    await input.press("Enter");
    await expect(page.locator(".lm-bubble--user")).toHaveCount(0);
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText("folder lock");
  });

  test("changing the folder moves the workspace and re-locks", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Workspace folder" }).click();
    const input = page.locator(".lm-ws__menu input");
    await input.fill("~/work/new-repo");
    await page.getByRole("button", { name: /Move & lock/ }).click();
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".lm-notif__row").first()).toContainText("Workspace moved");
    await expect(page.locator(".lm-wsbtn--held")).toBeVisible();
    // reopen the popover — it shows the new path, still locked
    await page.getByRole("button", { name: "Workspace folder" }).click();
    await expect(page.locator(".lm-ws__path")).toContainText("~/work/new-repo");
  });
});
