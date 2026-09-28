import { test, expect, request } from "@playwright/test";

const admin = { email: "john.smith@tiktockit.com", password: "DevPass123!" };
const staff = { email: "kevin.patel@tiktockit.com", password: "DevPass123!" };

async function createFixture() {
  const api = await request.newContext({ baseURL: "http://localhost:5173" });
  const email = `e2e-resolution-${Date.now()}@example.com`;
  try {
    expect((await api.post("/api/auth/login", { data: admin })).ok()).toBeTruthy();
    const created = await api.post("/api/admin/users", { data: { name: "E2E Resolution Requester", email, role: "REQUESTER", isActive: true, initialPassword: "TempPass1!" } });
    expect(created.status()).toBe(201);
    await api.post("/api/auth/logout");
    expect((await api.post("/api/auth/login", { data: { email, password: "TempPass1!" } })).ok()).toBeTruthy();
    expect((await api.post("/api/auth/change-password", { data: { currentPassword: "TempPass1!", newPassword: "RequesterPass1!" } })).ok()).toBeTruthy();
    const category = (await (await api.get("/api/categories")).json())[0];
    const system = (await (await api.get("/api/systems")).json())[0];
    const ticketResponse = await api.post("/api/tickets", { data: { categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM", summary: `E2E Resolution ${Date.now()}`, description: "Temporary ticket for resolution workflow E2E coverage." } });
    expect(ticketResponse.status()).toBe(201);
    const ticket = await ticketResponse.json();
    return { email, id: ticket.id as number };
  } finally { await api.dispose(); }
}

async function deactivate(email: string) {
  const api = await request.newContext({ baseURL: "http://localhost:5173" });
  try {
    expect((await api.post("/api/auth/login", { data: admin })).ok()).toBeTruthy();
    const users = await (await api.get(`/api/admin/users?search=${encodeURIComponent(email)}`)).json();
    const user = users.find((entry: { email: string; id: number }) => entry.email === email);
    if (user) await api.patch(`/api/admin/users/${user.id}`, { data: { isActive: false } });
  } finally { await api.dispose(); }
}

async function signIn(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);
}

test.describe("Lab 4 ticket resolution E2E", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({ }, testInfo) => test.skip(testInfo.project.name !== "desktop", "Database-mutating flow runs once."));

  test("E2E-03/E2E-04: resolved flag is advisory and staff uses permitted transition", async ({ page }) => {
    const fixture = await createFixture();
    try {
      await signIn(page, { email: fixture.email, password: "RequesterPass1!" });
      await page.goto(`/tickets/${fixture.id}`);
      await page.getByRole("button", { name: "Mark problem appears resolved" }).click();
      await expect(page.getByText("You marked this as resolved")).toBeVisible();
      await expect(page.getByText("New")).toBeVisible();
      await page.getByRole("button", { name: /E2E Resolution Requester/ }).click();
      await page.getByRole("button", { name: "Logout" }).click();
      await signIn(page, staff);
      await page.goto(`/queue/${fixture.id}`);
      await expect(page.locator("#current-status option")).toHaveCount(4);
      const statusOptions = await page.locator("#current-status option").evaluateAll((options) => options.map((option) => ({ value: (option as HTMLOptionElement).value, disabled: (option as HTMLOptionElement).disabled })));
      expect(statusOptions.filter((option) => !option.disabled && option.value).map((option) => option.value)).toEqual(["OPEN", "IN_PROGRESS", "CANCELLED"]);
      await page.locator("#current-status").selectOption("OPEN");
      await expect(page.getByText("Status saved.").first()).toBeVisible();
      await page.locator("#current-status").selectOption("IN_PROGRESS");
      await expect(page.getByText("Status saved.").first()).toBeVisible();
      await page.locator("#current-status").selectOption("RESOLVED");
      await expect(page.getByText("Status saved.").first()).toBeVisible();
      await expect(page.locator(".badge").filter({ hasText: "RESOLVED" })).toBeVisible();
    } finally { await deactivate(fixture.email); }
  });
});
