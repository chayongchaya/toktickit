import { test, expect } from "@playwright/test";

const requester = { email: "jennifer.anderson@kmutt.ac.th", password: "DevPass123!" };
const staff = { email: "kevin.patel@tiktockit.com", password: "DevPass123!" };

async function signIn(page: import("@playwright/test").Page, account: typeof requester) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);
}

test.describe("Lab 4 dashboards", () => {
  test.describe.configure({ mode: "serial" });
  test("E2E-05: requester lands on a scoped dashboard", async ({ page }) => {
    await signIn(page, requester);
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "View My Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: /My Open Tickets/ })).toHaveAttribute("href", "/tickets?currentStatus=OPEN");
  });

  test("E2E-06: staff lands on the queue dashboard", async ({ page }) => {
    await signIn(page, staff);
    await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible();
    const dashboardLink = page.locator('a[href="/dashboard"]');
    await expect(dashboardLink).toHaveAttribute("aria-current", "page");
    const myQueueLink = page.getByRole("link", { name: "My Queue", exact: true });
    await expect(myQueueLink).toBeVisible();
    await expect(page.getByRole("link", { name: /My Assigned/ })).toHaveAttribute("href", /^\/queue\?owner=\d+$/);
    await myQueueLink.click();
    await expect(page).toHaveURL(/.*\/queue$/);
    await expect(dashboardLink).not.toHaveAttribute("aria-current", "page");
  });
});
