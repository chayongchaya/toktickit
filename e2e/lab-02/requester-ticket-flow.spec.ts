import { test, expect } from "@playwright/test";

test.describe("TokTickIT Requester End-to-End Workflow", () => {
  test("Complete flow: Select Requester -> Create Ticket -> View in My Tickets -> Check Detail", async ({
    page,
  }) => {
    // 1. ไปหน้า Select Requester (ปรับพอร์ตให้ตรงกับเครื่อง)
    await page.goto("http://localhost:5174/select-requester");
    await expect(page.locator("h2, h1")).toContainText("Select Development Requester");

    // 2. กด Continue เข้าสู่ระบบ
    await page.click("button:has-text('Continue')");
    await expect(page).toHaveURL(/.*tickets/);

    // 3. ไปหน้าสร้าง Ticket
    await page.click("a:has-text('Create Ticket')");
    await expect(page).toHaveURL(/.*tickets\/new/);

    // 4. กรอกฟอร์มตั๋ว พร้อมเลือก Category และ Related System
    const uniqueSummary = `E2E Test Issue - ${Date.now()}`;
    await page.fill("#summary", uniqueSummary);
    await page.fill("#description", "Detailed testing description for Playwright E2E test verification.");
    
    // เลือก Category และ System ตัวแรกที่มีใน Dropdown
    await page.selectOption("#category", { index: 1 });
    await page.selectOption("#system", { index: 1 });

    await page.click("button[type='submit']");

    // 5. ตรวจสอบว่ากลับมาหน้า My Tickets และพบ Ticket ที่เพิ่งสร้าง
    await expect(page).toHaveURL(/.*tickets/);
    await expect(page.locator("table")).toContainText(uniqueSummary);

    // 6. คลิกแถวที่มี Ticket นั้นเพื่อเปิดดู Detail
    const ticketRow = page.locator("tr", { hasText: uniqueSummary });
    await ticketRow.locator("a").first().click();

    // 7. ตรวจสอบว่าเข้าหน้า Ticket Details สำเร็จ
    await expect(page).toHaveURL(/.*tickets\/\d+/);
    await expect(page.locator("text=Ticket Details")).toBeVisible();
    await expect(page.locator("text=Attached Files")).toBeVisible();
  });
});