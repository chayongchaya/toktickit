import { test, expect, request } from "@playwright/test";

const admin = { email: "john.smith@tiktockit.com", password: "DevPass123!" };
const staff = { email: "kevin.patel@tiktockit.com", password: "DevPass123!" };

async function createFixture() {
  const api = await request.newContext({ baseURL: "http://localhost:5173" });
  const email = `e2e-actions-${Date.now()}@example.com`;
  try {
    expect((await api.post("/api/auth/login", { data: admin })).ok()).toBeTruthy();
    const created = await api.post("/api/admin/users", { data: { name: "E2E Actions Requester", email, role: "REQUESTER", isActive: true, initialPassword: "TempPass1!" } });
    expect(created.status()).toBe(201);
    await api.post("/api/auth/logout");
    expect((await api.post("/api/auth/login", { data: { email, password: "TempPass1!" } })).ok()).toBeTruthy();
    expect((await api.post("/api/auth/change-password", { data: { currentPassword: "TempPass1!", newPassword: "RequesterPass1!" } })).ok()).toBeTruthy();
    const category = (await (await api.get("/api/categories")).json())[0];
    const system = (await (await api.get("/api/systems")).json())[0];
    const ticket = await api.post("/api/tickets", { data: { categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM", summary: `E2E Actions ${Date.now()}`, description: "Temporary ticket for Actions Taken E2E coverage." } });
    expect(ticket.status()).toBe(201);
    return { email, id: (await ticket.json()).id as number };
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

test.describe("Lab 4 Actions Taken E2E", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({ }, testInfo) => test.skip(testInfo.project.name !== "desktop", "Database-mutating flow runs once."));

  test("E2E-01/E2E-02: staff creates and edits an action, then requester can read it", async ({ page }) => {
    const fixture = await createFixture();
    try {
      await signIn(page, staff);
      await page.goto(`/queue/${fixture.id}`);
      await page.getByRole("tab", { name: /Actions Taken/ }).click();
      await page.getByRole("button", { name: "+ Add Action Taken" }).click();
      await page.getByLabel("Action Description").fill("Reissued VPN certificate");
      await page.getByLabel("Result").fill("Requester connected successfully");
      await page.getByLabel("Follow-Up Required?").check();
      await page.getByRole("button", { name: "Save Action Taken" }).click();
      await expect(page.getByRole("alert")).toContainText("Follow-up Note is required");
      await page.getByLabel("Follow-up Note").fill("Confirm connection tomorrow");
      await page.getByRole("button", { name: "Save Action Taken" }).click();
      await expect(page.getByText("Reissued VPN certificate")).toBeVisible();
      await page.getByRole("button", { name: "Edit" }).click();
      await page.getByLabel("Result").fill("Requester connected and confirmed");
      await page.getByRole("button", { name: "Save Action Taken" }).click();
      await expect(page.getByText("Requester connected and confirmed")).toBeVisible();
      await page.getByRole("button", { name: /Kevin Patel/ }).click();
      await page.getByRole("button", { name: "Logout" }).click();
      await expect(page).toHaveURL(/.*\/login/);
      await signIn(page, { email: fixture.email, password: "RequesterPass1!" });
      await page.goto(`/tickets/${fixture.id}`);
      await expect(page.getByText("Reissued VPN certificate")).toBeVisible();
      await expect(page.getByText("Requester connected and confirmed")).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    } finally { await deactivate(fixture.email); }
  });
});
