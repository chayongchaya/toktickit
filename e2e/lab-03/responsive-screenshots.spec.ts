import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..", "..", "artifacts", "lab-03", "screenshots");
const admin = { email: "john.smith@tiktockit.com", password: "DevPass123!" };
const staff = { email: "kevin.patel@tiktockit.com", password: "DevPass123!" };

async function signIn(page: import("@playwright/test").Page, account: { email: string; password: string }, destination: RegExp) {
  await page.goto("/login");
  await expect(page.getByText("TokTickIT")).toBeVisible();
  await page.fill("#login-email", account.email);
  await page.fill("#login-password", account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(destination);
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function capture(page: import("@playwright/test").Page, section: string, project: string) {
  const directory = path.join(root, section);
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${project}.png`), fullPage: true });
}

test.describe("Lab 3 responsive visual evidence", () => {
  test("captures Login", async ({ page }, testInfo) => {
    await page.goto("/login");
    await expect(page.getByText("TokTickIT")).toBeVisible();
    await capture(page, "authentication", testInfo.project.name);
  });

  test("captures Staff Queue and checks mobile overflow", async ({ page }, testInfo) => {
    await signIn(page, staff, /.*\/queue/);
    await expect(page.getByRole("heading", { name: "My Queue" })).toBeVisible();
    await page.locator("a[href^='/queue/']:visible").first().waitFor().catch(() => undefined);
    await capture(page, "staff-queue", testInfo.project.name);
    await expectNoHorizontalOverflow(page);
  });

  test("captures Staff Ticket Detail", async ({ page }, testInfo) => {
    await signIn(page, staff, /.*\/queue/);
    const ticket = page.locator("a[href^='/queue/']:visible").first();
    await expect(ticket).toBeVisible();
    await ticket.click();
    await expect(page.getByText("Staff Ticket Detail")).toBeVisible();
    await capture(page, "staff-ticket-detail", testInfo.project.name);
    await expectNoHorizontalOverflow(page);
  });

  test("captures User Management", async ({ page }, testInfo) => {
    await signIn(page, admin, /.*\/admin\/users/);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await capture(page, "user-management", testInfo.project.name);
    await expectNoHorizontalOverflow(page);
  });
});
