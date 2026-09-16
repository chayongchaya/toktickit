import { test, expect, request } from "@playwright/test";

const admin = { email: "john.smith@tiktockit.com", password: "DevPass123!" };
const requester = { email: "jennifer.anderson@kmutt.ac.th", password: "DevPass123!" };

async function loginApi(api: Awaited<ReturnType<typeof request>>, account: { email: string; password: string }) {
  const response = await api.post("/api/auth/login", { data: account });
  expect(response.ok()).toBeTruthy();
}

test.describe("Lab 3 authentication flows", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Database-mutating authentication flow runs once; responsive coverage is tracked separately.");
  });

  test("E2E-01: initial password forces change before the role-correct shell", async ({ page }) => {
    const api = await request.newContext({ baseURL: "http://localhost:5173" });
    const email = `e2e-first-login-${Date.now()}@example.com`;
    try {
      await loginApi(api, admin);
      const created = await api.post("/api/admin/users", { data: { name: "E2E First Login", email, role: "REQUESTER", isActive: true, initialPassword: "TempPass1!" } });
      expect(created.status()).toBe(201);

      await page.goto("/login");
      await page.getByLabel("Email address").fill(email);
      await page.locator("#login-password").fill("TempPass1!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/.*\/change-password/);
      await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();

      await page.getByLabel("Current (temporary) password").fill("TempPass1!");
      await page.getByRole("textbox", { name: "New password", exact: true }).fill("NewValid1!");
      await page.getByLabel("Confirm new password").fill("NewValid1!");
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page).toHaveURL(/.*\/tickets/);
      await expect(page.getByRole("link", { name: /My Tickets/ })).toBeVisible();
    } finally {
      await api.patch(`/api/admin/users/${(await api.get(`/api/admin/users?search=${encodeURIComponent(email)}`)).json().then((users: Array<{ id: number }>) => users[0]?.id ?? 0)}`, { data: { isActive: false } });
      await api.dispose();
    }
  });

  test("E2E-02: logout invalidates the session and protects direct navigation", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(requester.email);
    await page.locator("#login-password").fill(requester.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/.*\/tickets/);
    await page.getByRole("button", { name: /Jennifer Anderson/ }).click();
    await page.getByRole("button", { name: /Logout/ }).click();
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto("/queue");
    await expect(page).toHaveURL(/.*\/login/);
    expect(await page.getByText("Sign in to your account").isVisible()).toBe(true);
    expect(await page.getByText("My Queue").count()).toBe(0);
  });
});
