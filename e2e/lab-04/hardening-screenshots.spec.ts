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

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth || element.getBoundingClientRect().left < 0)
      .slice(0, 10)
      .map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right, left: element.getBoundingClientRect().left })),
  }));
  if (dimensions.scrollWidth > dimensions.viewportWidth) console.log("horizontal overflow", dimensions);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test.describe("Lab 4 hardening screenshots", () => {
  test.describe.configure({ mode: "serial" });

  test("captures staff dashboard evidence", async ({ page }, testInfo) => {
    await signIn(page, staff);
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/lab-04/screenshots/staff-dashboard/${testInfo.project.name}.png`, fullPage: true });
  });

  test("captures requester dashboard evidence", async ({ page }, testInfo) => {
    await signIn(page, requester);
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/lab-04/screenshots/requester-dashboard/${testInfo.project.name}.png`, fullPage: true });
  });

  test("captures Actions Taken evidence", async ({ page }, testInfo) => {
    await signIn(page, staff);
    await page.goto("/queue");
    const firstTicket = page.locator('a[href^="/queue/"]').first();
    const ticketHref = await firstTicket.getAttribute("href");
    expect(ticketHref).toBeTruthy();
    await page.goto(ticketHref!);
    await expect(page.getByRole("tab", { name: /Actions Taken/ })).toBeVisible();
    await page.getByRole("tab", { name: /Actions Taken/ }).click();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/lab-04/screenshots/actions-taken/${testInfo.project.name}.png`, fullPage: true });
  });
});
