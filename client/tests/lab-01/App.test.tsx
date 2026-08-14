import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself.
  it("shows Online and the seeded categories on success", async () => {
    const user = userEvent.setup();

    const mockCategories: api.Category[] = [
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ];

    const spy = vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: mockCategories,
    });

    render(<App />);

    // กดปุ่มตรวจสอบสถานะระบบ (หากมีปุ่มให้กด)
    const button = screen.queryByRole("button");
    if (button && !button.hasAttribute("disabled")) {
      await user.click(button);
    }

    // ตรวจสอบว่ามีคำว่า Online ปรากฏ
    expect(await screen.findByText(/online/i)).toBeInTheDocument();

    // ตรวจสอบว่าชื่อ Categories ทั้ง 4 หมวดหมู่แสดงผลครบถ้วน
    for (const category of mockCategories) {
      expect(await screen.findByText(category.name)).toBeInTheDocument();
    }

    expect(spy).toHaveBeenCalled();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    const user = userEvent.setup();

    const spy = vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("API is unavailable")
    );

    render(<App />);

    // กดปุ่มตรวจสอบสถานะระบบ (หากมีปุ่มให้กด)
    const button = screen.queryByRole("button");
    if (button && !button.hasAttribute("disabled")) {
      await user.click(button);
    }

    // ตรวจสอบว่าแสดงสถานะ Offline เมื่อไม่สามารถเชื่อมต่อ API ได้
    expect(await screen.findByText(/offline/i)).toBeInTheDocument();

    expect(spy).toHaveBeenCalled();
  });
});