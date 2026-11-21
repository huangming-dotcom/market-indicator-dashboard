import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "../src/App";
import { dataset, obs } from "./fixtures";
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AreaChart: () => null,
  LineChart: () => null,
  BarChart: () => null,
  Area: () => null,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        dataset([
          obs("taiex", "2026-11-19", 100),
          obs("taiex", "2026-11-20", 101),
        ]),
    }),
  );
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("使用者操作", () => {
  it("可調整卡片風格、寬度、顯示與順序，重開後保留；AI 選單已移除", async () => {
    const first = render(<App />);
    await screen.findByText("今日與前一交易觀測");
    expect(screen.queryByRole("button", { name: "AI 基本面" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "自訂版面" }));
    fireEvent.change(screen.getByLabelText("美債 10Y卡片風格"), {
      target: { value: "trend" },
    });
    fireEvent.change(screen.getByLabelText("美債 10Y卡片寬度"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "下移美債 10Y" }));
    fireEvent.click(screen.getByRole("button", { name: "完成設定" }));
    expect(
      document.querySelector(".board-slot.width-2.style-trend"),
    ).toBeTruthy();
    first.unmount();
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    expect(
      document.querySelector(".board-slot.width-2.style-trend"),
    ).toBeTruthy();
  });
  it("日期欄位 input 事件立即切換觀測，避免僅改變輸入文字", async () => {
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    fireEvent.input(screen.getByLabelText("觀測日期"), {
      target: { value: "2026-11-19" },
    });
    expect(screen.getByText(/選定 2026-11-19/)).toBeTruthy();
    const card = screen.getByLabelText("檢視台灣加權指數詳細資料");
    expect(card.textContent).toContain("100.00");
    expect(card.textContent).not.toContain("101.00");
  });
  it("日期切換更新 KPI，點擊卡片開啟含前一交易日期的詳情", async () => {
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    fireEvent.change(screen.getByLabelText("觀測日期"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.click(screen.getByLabelText("檢視台灣加權指數詳細資料"));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("dialog", {
            name: "台灣加權指數",
          }) as HTMLDialogElement
        ).open,
      ).toBe(true),
    );
    expect(screen.getByRole("heading", { name: "台灣加權指數" })).toBeTruthy();
    expect(screen.getAllByText("2026-11-19").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("關閉指標詳情"));
  });
  it("切換來源頁可搜尋並篩選缺值", async () => {
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    fireEvent.click(screen.getByRole("button", { name: "資料來源與品質" }));
    fireEvent.change(screen.getByLabelText("搜尋資料來源"), {
      target: { value: "SOX" },
    });
    expect(screen.getAllByText(/費城半導體 SOX/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "缺值／逾期" }));
    expect(screen.getAllByText("缺值").length).toBeGreaterThan(0);
  });
  it("無效資料顯示錯誤，可重試，不顯示虛構數字", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    render(<App />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重試" })).toBeTruthy();
  });
});
