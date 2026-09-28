import { test, expect } from "@playwright/test";

const requester = { email: "jennifer.anderson@kmutt.ac.th", password: "DevPass123!" };
const staff = { email: "kevin.patel@tiktockit.com", password: "DevPass123!" };

async function signIn(page: import("@playwright/test").Page, account: typeof requester) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);
}

test.describe("Lab 4 dashboards", () => {
  test("E2E-05: requester lands on a scoped dashboard", async ({ page }) => {
    await signIn(page, requester);
    await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /My Tickets/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /My Open Tickets/ })).toHaveAttribute("href", "/tickets?currentStatus=OPEN");
  });

  test("E2E-06: staff lands on the queue dashboard", async ({ page }) => {
    await signIn(page, staff);
    await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /My Queue/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /My Assigned/ })).toHaveAttribute("href", /^\/queue\?owner=\d+$/);
  });
});
