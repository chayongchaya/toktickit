import { test, expect } from "@playwright/test";

test.describe("TokTickIT Requester End-to-End Workflow", () => {
  test("Complete flow: Select Requester -> Create Ticket -> View in My Tickets -> Check Detail", async ({
    page,
  }) => {
    // 1. ไปหน้า Select Requester. Use a relative path so this respects
    // playwright.config.ts's `baseURL` (see client/vite.config.ts, which
    // pins the Vite dev server to port 5173 — the same port
    // playwright.config.ts defaults to). A hardcoded absolute URL here
    // previously pointed at the wrong port (5174) and broke as soon as
    // the dev server actually ran on its configured port.
    await page.goto("/select-requester");
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

    // 5. หลังสร้างสำเร็จ CreateTicketPage แสดงหน้า success (Ticket Number +
    // ปุ่ม "Back to My Tickets") แทนที่จะ redirect ไป /tickets ให้อัตโนมัติ —
    // ต้องกดปุ่มนี้ก่อนถึงจะกลับไปหน้า My Tickets จริงๆ (ดู
    // CreateTicketPage.tsx บรรทัด ~188 "Ticket Submitted Successfully").
    await expect(page.locator("text=Ticket Submitted Successfully")).toBeVisible();
    await page.click("button:has-text('Back to My Tickets')");

    // 6. ตรวจสอบว่ากลับมาหน้า My Tickets และพบ Ticket ที่เพิ่งสร้าง
    await expect(page).toHaveURL(/.*\/tickets$/);
    await expect(page.locator("table")).toContainText(uniqueSummary);

    // 7. คลิกแถวที่มี Ticket นั้นเพื่อเปิดดู Detail. TicketListPage renders
    // two layouts and hides one via CSS depending on viewport width (spec
    // 8.7): the desktop/tablet <table> is `d-none d-md-block`, and a
    // mobile card list (`[data-testid="ticket-card"]`) is `d-md-none`.
    // Both exist in the DOM at all viewport sizes — only one is actually
    // visible — so match whichever container is visible instead of
    // assuming a <tr> (which is invisible, and therefore unclickable, on
    // the mobile viewport).
    const ticketRow = page
      .locator("tr:visible, [data-testid='ticket-card']:visible", { hasText: uniqueSummary });
    await ticketRow.locator("a").first().click();

    // 8. ตรวจสอบว่าเข้าหน้า Ticket Details สำเร็จ
    await expect(page).toHaveURL(/.*tickets\/\d+/);
    await expect(page.locator("text=Ticket Details")).toBeVisible();
    await expect(page.locator("text=Attached Files")).toBeVisible();
  });
});