# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-02\requester-ticket-flow.spec.ts >> TokTickIT Requester End-to-End Workflow >> Complete flow: Select Requester -> Create Ticket -> View in My Tickets -> Check Detail
- Location: e2e\lab-02\requester-ticket-flow.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/select-requester
Call log:
  - navigating to "http://localhost:5174/select-requester", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("TokTickIT Requester End-to-End Workflow", () => {
  4  |   test("Complete flow: Select Requester -> Create Ticket -> View in My Tickets -> Check Detail", async ({
  5  |     page,
  6  |   }) => {
  7  |     // 1. ไปหน้า Select Requester (ปรับพอร์ตให้ตรงกับเครื่อง)
> 8  |     await page.goto("http://localhost:5174/select-requester");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/select-requester
  9  |     await expect(page.locator("h2, h1")).toContainText("Select Development Requester");
  10 | 
  11 |     // 2. กด Continue เข้าสู่ระบบ
  12 |     await page.click("button:has-text('Continue')");
  13 |     await expect(page).toHaveURL(/.*tickets/);
  14 | 
  15 |     // 3. ไปหน้าสร้าง Ticket
  16 |     await page.click("a:has-text('Create Ticket')");
  17 |     await expect(page).toHaveURL(/.*tickets\/new/);
  18 | 
  19 |     // 4. กรอกฟอร์มตั๋ว พร้อมเลือก Category และ Related System
  20 |     const uniqueSummary = `E2E Test Issue - ${Date.now()}`;
  21 |     await page.fill("#summary", uniqueSummary);
  22 |     await page.fill("#description", "Detailed testing description for Playwright E2E test verification.");
  23 |     
  24 |     // เลือก Category และ System ตัวแรกที่มีใน Dropdown
  25 |     await page.selectOption("#category", { index: 1 });
  26 |     await page.selectOption("#system", { index: 1 });
  27 | 
  28 |     await page.click("button[type='submit']");
  29 | 
  30 |     // 5. ตรวจสอบว่ากลับมาหน้า My Tickets และพบ Ticket ที่เพิ่งสร้าง
  31 |     await expect(page).toHaveURL(/.*tickets/);
  32 |     await expect(page.locator("table")).toContainText(uniqueSummary);
  33 | 
  34 |     // 6. คลิกแถวที่มี Ticket นั้นเพื่อเปิดดู Detail
  35 |     const ticketRow = page.locator("tr", { hasText: uniqueSummary });
  36 |     await ticketRow.locator("a").first().click();
  37 | 
  38 |     // 7. ตรวจสอบว่าเข้าหน้า Ticket Details สำเร็จ
  39 |     await expect(page).toHaveURL(/.*tickets\/\d+/);
  40 |     await expect(page.locator("text=Ticket Details")).toBeVisible();
  41 |     await expect(page.locator("text=Attached Files")).toBeVisible();
  42 |   });
  43 | });
```