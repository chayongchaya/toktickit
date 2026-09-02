import { defineConfig, devices } from "@playwright/test";

// Base URL for the Vite dev server (see client/vite.config.ts).
// Override with PLAYWRIGHT_BASE_URL if the client is running on a different port.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // NOTE: server/src/routes/tickets.ts generates ticket numbers via
  // count()-then-insert, which races when multiple ticket-creation requests
  // land at once (two requests can read the same count and collide on the
  // unique ticketNumber). Running workers: 1 here avoids triggering that
  // pre-existing backend bug from this suite; it's out of scope to fix on
  // this branch. Remove this once the backend generates ticket numbers
  // atomically (e.g. a DB sequence or a transaction with a row lock).
  workers: 1,
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
