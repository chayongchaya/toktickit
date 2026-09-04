import { test, expect } from "@playwright/test";
import path from "path";

// Screenshot evidence for section 8.8 of the labsheet / Part 9 of the PDF submission.
// Run with: npx playwright test e2e/lab-02/responsive-screenshots.spec.ts
// Images are written to artifacts/lab-02/screenshots/<viewport>-<page>.png
const ARTIFACT_DIR = path.join(__dirname, "..", "..", "artifacts", "lab-02", "screenshots");

// Selects a requester by name on the Select Requester screen, then clicks Continue.
// Pass a name (or part of one) to pick a specific requester for the screenshots
// instead of always getting whichever one the dropdown defaults to.
async function selectRequester(page: import("@playwright/test").Page, requesterName?: string) {
  await page.goto("/select-requester");
  await expect(page.locator("h1, h2")).toContainText("Select Development Requester");

  if (requesterName) {
    const option = page.locator("#requester-select option", { hasText: requesterName }).first();
    await expect(option).toHaveCount(1);
    const value = await option.getAttribute("value");
    await page.locator("#requester-select").selectOption(value!);
  }

  await page.click("button:has-text('Continue')");
  await expect(page).toHaveURL(/.*tickets/);
}

// Change this to target a different requester's data in the screenshots
// (must match part of their name/email as shown in the dropdown, e.g.
// "Michael Brown" or just "Brown"). Leave undefined to use whichever
// requester the dropdown defaults to.
const SCREENSHOT_REQUESTER: string | undefined = "Jennifer";

// The seeded dev database has no tickets for any requester (see server/prisma/seed.ts),
// so the Ticket Detail screenshot needs a ticket to actually exist first. This mirrors
// the create-then-view flow in requester-ticket-flow.spec.ts rather than assuming one
// is already present.
//
// After a successful submit, CreateTicketPage shows a confirmation screen ("Ticket
// Submitted Successfully") instead of navigating straight back to the list — see
// CreateTicketPage.tsx's `createdTicket` success state. Callers use the confirmation
// screen's own buttons ("View Ticket" / "Back to My Tickets") rather than re-finding
// the ticket in the table or card list.
async function createTicketAndConfirm(page: import("@playwright/test").Page): Promise<string> {
  await page.click("a:has-text('Create Ticket')");
  await expect(page).toHaveURL(/.*tickets\/new/);

  const uniqueSummary = `Screenshot Evidence Ticket - ${Date.now()}`;
  await page.fill("#summary", uniqueSummary);
  await page.fill(
    "#description",
    "Ticket created by the responsive screenshot suite so a Ticket Detail view exists to capture."
  );
  await page.selectOption("#category", { index: 1 });
  await page.selectOption("#system", { index: 1 });
  await page.click("button[type='submit']");

  await expect(page.locator("h1")).toContainText("Ticket Submitted Successfully", { timeout: 10000 });
  return uniqueSummary;
}

test.describe("Responsive visual regression screenshots", () => {
  test("Select Requester screen", async ({ page }, testInfo) => {
    await page.goto("/select-requester");
    await expect(page.locator("h1, h2")).toContainText("Select Development Requester");

    // Capture the screen as the user first sees it, before making a selection,
    // so the screenshot shows the default/empty state of the dropdown.
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `${testInfo.project.name}-select-requester.png`),
      fullPage: true,
    });
  });

  test("My Tickets list", async ({ page }, testInfo) => {
    await selectRequester(page, SCREENSHOT_REQUESTER);
    // Create a ticket first so the screenshot shows real table/card content
    // instead of the empty state (the seeded dev DB starts with zero tickets).
    await createTicketAndConfirm(page);
    await page.click("button:has-text('Back to My Tickets')");
    await expect(page.locator("h1")).toContainText("My Tickets");

    // Give the ticket table/card view time to finish loading before capturing.
    await page.waitForSelector("text=Loading tickets...", { state: "detached" }).catch(() => {});

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `${testInfo.project.name}-my-tickets.png`),
      fullPage: true,
    });
  });

  test("Create Ticket form", async ({ page }, testInfo) => {
    await selectRequester(page, SCREENSHOT_REQUESTER);
    await page.click("a:has-text('Create Ticket')");
    await expect(page).toHaveURL(/.*tickets\/new/);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `${testInfo.project.name}-create-ticket.png`),
      fullPage: true,
    });
  });

  test("Ticket Detail view", async ({ page }, testInfo) => {
    await selectRequester(page, SCREENSHOT_REQUESTER);
    await createTicketAndConfirm(page);

    // The confirmation screen links straight to the new ticket's detail page —
    // simpler and more reliable than re-finding it in the table/card list.
    await page.click("a:has-text('View Ticket')");

    await expect(page).toHaveURL(/.*tickets\/\d+/);
    await expect(page.locator("text=Ticket Details")).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `${testInfo.project.name}-ticket-detail.png`),
      fullPage: true,
    });
  });

  test("My Tickets has zero horizontal scroll on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Horizontal-scroll check only applies to the mobile viewport");

    await selectRequester(page, SCREENSHOT_REQUESTER);
    await createTicketAndConfirm(page);
    await page.click("button:has-text('Back to My Tickets')");
    await page.waitForSelector("text=Loading tickets...", { state: "detached" }).catch(() => {});

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});