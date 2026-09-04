import { defineConfig, devices } from "@playwright/test";

// Base URL for the Vite dev server (see client/vite.config.ts).
// Override with PLAYWRIGHT_BASE_URL if the client is running on a different port.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // NOTE (previously): server/src/routes/tickets.ts used to generate
  // ticket numbers via count()-then-insert with no collision handling,
  // which raced when multiple ticket-creation requests landed at once.
  // That has since been fixed: generateTicketNumber() is now wrapped in
  // createTicketWithUniqueNumber(), which retries with a freshly
  // generated number whenever the DB's unique constraint on
  // `ticketNumber` rejects a collision (Prisma error P2002). Parallel
  // workers are safe again as a result, so the workers: 1 override that
  // used to live here has been removed. If E2E runs become flaky again,
  // re-check createTicketWithUniqueNumber before re-adding a worker cap.
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], viewport: { width: 820, height: 1180 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
});
