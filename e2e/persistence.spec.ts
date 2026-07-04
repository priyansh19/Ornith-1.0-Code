import { test, expect } from "@playwright/test";

/* Covers the checklist item: "backend session id generated client-side
   upfront ... never left empty at any point, including after a reload".
   Seeds localStorage with a persisted conversation for the live `a2a`
   harness that already carries a backend session id (as if a prior turn
   had run), reloads the app, mocks the backend, and asserts the very next
   turn reuses that SAME backend session id instead of silently minting a
   fresh one — which would orphan the backend's real conversational
   context even though the UI still shows continuous chat history. */

const LS_KEY = "mach2:lmchat:v1";
const PERSISTED_BACKEND_SESSION_ID = "11111111-2222-3333-4444-555555555555";

function seededState() {
  return {
    sessions: [
      {
        id: "s1",
        title: "Ongoing a2a chat",
        harnessId: "a2a",
        folderId: null,
        when: "2m",
        lastActiveAt: Date.now(),
        project: "~/projects/mach2-harness",
        messages: [
          { role: "user", content: "Hello from before the reload" },
          { role: "assistant", content: "Hi — picking up your earlier context." },
        ],
        insp: { status: "idle", session: PERSISTED_BACKEND_SESSION_ID },
        permTier: "ask",
        config: {},
        attached: [],
        run: { status: "idle", step: 0 },
        runs: [],
      },
    ],
    folders: [],
    activeId: "s1",
    harnessLoaded: {
      "agent-base": true,
      harness: true,
      research: false,
      a2a: true,
      memory: false,
    },
    model: "ornith:9b",
    provider: {
      id: "ollama-local",
      name: "Ollama (local)",
      url: "http://localhost:11434",
      isDefault: true,
      connected: true,
    },
    density: "comfortable",
    reduceMotion: false,
  };
}

test("a reloaded live-harness conversation reuses its persisted backend session id, never mints a fresh one", async ({
  page,
}) => {
  // Seed localStorage before any app script runs.
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: LS_KEY, value: seededState() },
  );

  // Backend health check — report healthy so the composer isn't blocked on
  // the server-down affordance.
  await page.route("**/health", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok" }) }),
  );

  let capturedSessionId: string | undefined;
  await page.route("**/chat-stream", async (route) => {
    const body = route.request().postDataJSON() as { session_id?: string };
    capturedSessionId = body.session_id;
    const sse =
      `data: ${JSON.stringify({ type: "done", answer: "Continuing fine.", session_id: capturedSessionId })}\n\n`;
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse,
    });
  });

  await page.goto("/");
  await expect(page.locator(".lm-app")).toBeVisible();

  // Sanity: the reloaded conversation's prior history survived.
  await expect(page.locator(".lm-bubble--user").first()).toContainText(
    "Hello from before the reload",
  );

  // Send a new turn in this same (reloaded) conversation.
  const input = page.locator(".lm-composer__input");
  await input.fill("Please continue.");
  await input.press("Enter");

  await expect(page.locator(".lm-bubble--assistant").last()).toContainText(
    "Continuing fine.",
    { timeout: 10000 },
  );

  expect(capturedSessionId).toBe(PERSISTED_BACKEND_SESSION_ID);
});
