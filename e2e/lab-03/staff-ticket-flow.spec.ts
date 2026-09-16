import { test, expect, request } from "@playwright/test";

const staff = { email: "kevin.patel@tiktockit.com", password: "DevPass123!", name: "Kevin Patel" };
const admin = { email: "john.smith@tiktockit.com", password: "DevPass123!" };

async function signIn(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill("#login-email", account.email);
  await page.fill("#login-password", account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/.*\/login/);
}

async function logout(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: /Logout/ }).click();
  await expect(page).toHaveURL(/.*\/login/);
}

async function createRequesterFixture() {
  const api = await request.newContext({ baseURL: "http://localhost:5173" });
  const email = `e2e-staff-requester-${Date.now()}@example.com`;
  const temporaryPassword = "TempPass1!";
  const password = "RequesterPass1!";
  try {
    const adminLogin = await api.post("/api/auth/login", { data: admin });
    expect(adminLogin.ok()).toBeTruthy();
    const createdUser = await api.post("/api/admin/users", { data: { name: "E2E Staff Requester", email, role: "REQUESTER", isActive: true, initialPassword: temporaryPassword } });
    expect(createdUser.status()).toBe(201);
    const requester = { email, password: temporaryPassword };
    await api.post("/api/auth/logout");
    const requesterLogin = await api.post("/api/auth/login", { data: requester });
    expect(requesterLogin.ok()).toBeTruthy();
    const changed = await api.post("/api/auth/change-password", { data: { currentPassword: temporaryPassword, newPassword: password } });
    expect(changed.ok()).toBeTruthy();
    const categories = await api.get("/api/categories");
    const systems = await api.get("/api/systems");
    const category = (await categories.json())[0];
    const system = (await systems.json())[0];
    const summary = `E2E staff workflow ${Date.now()}`;
    const created = await api.post("/api/tickets", { data: { categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM", summary, description: "Fixture ticket for the Lab 3 staff workflow." } });
    expect(created.ok()).toBeTruthy();
    return { id: (await created.json()).id as number, summary, email };
  } finally {
    await api.dispose();
  }
}

async function deactivateRequesterFixture(email: string) {
  const api = await request.newContext({ baseURL: "http://localhost:5173" });
  try {
    const login = await api.post("/api/auth/login", { data: admin });
    expect(login.ok()).toBeTruthy();
    const users = await api.get(`/api/admin/users?search=${encodeURIComponent(email)}`);
    expect(users.ok()).toBeTruthy();
    const user = (await users.json()).find((entry: { email: string; id: number }) => entry.email === email);
    if (user) {
      const response = await api.patch(`/api/admin/users/${user.id}`, { data: { isActive: false } });
      expect(response.ok()).toBeTruthy();
    }
  } finally {
    await api.dispose();
  }
}

test.describe("IT Staff ticket workflow", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Database-mutating staff workflow runs once; responsive coverage is tracked separately.");
  });

  test("claims a ticket, posts comment and note, changes status, and hides the note from requester", async ({ page }) => {
    const fixture = await createRequesterFixture();
    try {
      await signIn(page, staff);
      await expect(page).toHaveURL(/.*\/queue/);
      await page.getByLabel("Search tickets").fill(fixture.summary);
      const ticketLink = page.locator("tr:visible, [data-testid='ticket-card']:visible", { hasText: fixture.summary }).locator("a[href^='/queue/']").first();
      await expect(ticketLink).toBeVisible();
      const ticketUrl = await ticketLink.getAttribute("href");
      await ticketLink.click();
      await expect(page.getByText("Staff Ticket Detail")).toBeVisible();

      await page.getByRole("button", { name: "Claim for myself" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Owner saved." }).first()).toBeVisible();

      const publicComment = `E2E public update ${Date.now()}`;
      await page.getByLabel("Add Public Comment").fill(publicComment);
      await page.getByRole("button", { name: "Post Comment" }).click();
      await expect(page.getByText(publicComment)).toBeVisible();

      await page.getByRole("tab", { name: /Internal Notes/ }).click();
      const internalNote = `E2E internal note ${Date.now()}`;
      await page.getByLabel("Add Internal Note").fill(internalNote);
      await page.getByRole("button", { name: "Add Note" }).click();
      await expect(page.getByText(internalNote)).toBeVisible();

      await page.locator("#current-status").selectOption("OPEN");
      await expect(page.getByRole("status").filter({ hasText: "Status saved." }).first()).toBeVisible();
      await logout(page, staff.name);

      await signIn(page, { email: fixture.email, password: "RequesterPass1!" });
      await page.goto(ticketUrl!.replace("/queue/", "/tickets/"));
      await expect(page.getByText(publicComment)).toBeVisible();
      await expect(page.getByText(internalNote)).not.toBeVisible();
    } finally {
      await deactivateRequesterFixture(fixture.email);
    }
  });
});
