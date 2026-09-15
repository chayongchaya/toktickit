import { test, expect } from "@playwright/test";

const adminEmail = "john.smith@tiktockit.com";
const seedPassword = "DevPass123!";

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#login-email", adminEmail);
  await page.fill("#login-password", seedPassword);
  await page.click("button[type='submit']");
  await expect(page).toHaveURL(/.*\/admin\/users/);
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
}

test.describe("Administrator user management", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "User-management mutation flow runs once; responsive coverage is tracked by RESP-01.");
  });

  test("searches, creates, and rejects a duplicate email", async ({ page }) => {
    await signInAsAdmin(page);
    await page.getByLabel("Search users").fill("Kevin");
    await expect(page.getByText("Kevin Patel")).toBeVisible();

    const email = `e2e-admin-${Date.now()}@example.com`;
    await page.getByLabel("Full Name").fill("E2E Managed User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Initial Password").fill("TempPass1!");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByRole("status")).toContainText("User created successfully");

    await page.getByLabel("Full Name").fill("Duplicate E2E User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Initial Password").fill("TempPass1!");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByText("A user with this email already exists")).toBeVisible();

    await page.getByLabel("Search users").fill("");
    const createdRow = page.locator("tr", { hasText: email });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Set New Initial Password" }).click();
    await page.getByLabel("New Initial Password").fill("ResetPass1!");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByRole("status")).toContainText("User saved successfully");

    await page.getByRole("button", { name: /John Smith/ }).click();
    await page.getByRole("button", { name: /Logout/ }).click();
    await page.getByLabel("Email address").fill(email);
    await page.locator("#login-password").fill("ResetPass1!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/.*\/change-password/);
    await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
  });

  test("shows a visible conflict when self-deactivation is attempted", async ({ page }) => {
    await signInAsAdmin(page);
    const row = page.locator("tr", { hasText: adminEmail });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Deactivate User" }).click();
    await expect(page.getByRole("alert")).toContainText("cannot deactivate your own account");

    // The seeded database has one active Administrator. Changing that user's
    // role exercises the same last-admin safety rule without invalidating the
    // session before the assertion can be observed.
    await page.locator("#user-role").selectOption("REQUESTER");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByRole("alert")).toContainText("last active Administrator");
  });
});
