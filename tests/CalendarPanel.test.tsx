import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CalendarPanel from "../src/CalendarPanel";
import { CALENDAR_ID, CALENDAR_URL, CALENDAR_ICS } from "../src/calendar.mjs";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const timed = {
  id: "cpi",
  uid: "cpi",
  title: "美國-CPI",
  description: "市場預期: 3.2%\n前值: 3.1%",
  date: "2026-11-26",
  allDay: false,
  startAt: "2026-11-25T19:00:00Z",
  endAt: null,
  endDate: null,
  sourceTimezone: "UTC",
  status: "CONFIRMED",
  updatedAt: null,
  chartUrl: null,
};
const syncedAt = new Date().toISOString();
const data = {
  schemaVersion: 1,
  source: {
    id: CALENDAR_ID,
    name: "財經 M 平方 - 全球財經日曆",
    url: CALENDAR_URL,
    feedUrl: CALENDAR_ICS,
  },
  lastAttemptAt: syncedAt,
  lastSuccessAt: syncedAt,
  status: "success",
  message: null,
  rawHash: "a".repeat(64),
  coverage: { start: "2026-08-01", end: "2027-12-01" },
  sourceEventCount: 2,
  events: [
    timed,
    {
      ...timed,
      id: "all-day",
      uid: "all-day",
      title: "台灣-全天事件",
      allDay: true,
      startAt: null,
      endAt: null,
      endDate: "2026-11-27",
    },
  ],
};
describe("總經事件日曆操作", () => {
  it("以台灣時間顯示跨日發布／全天缺時刻；支援地區、搜尋及 30 日切換", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
    );
    render(<CalendarPanel date="2026-11-23" />);
    await screen.findByText("美國-CPI");
    expect(screen.getByText("03:00")).toBeTruthy();
    expect(screen.getByText("全天／時刻未提供")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("日曆國家地區"), {
      target: { value: "美國" },
    });
    expect(screen.queryByText("台灣-全天事件")).toBeNull();
    fireEvent.change(screen.getByLabelText("搜尋總經事件"), {
      target: { value: "nonexistent" },
    });
    expect(screen.queryByText("美國-CPI")).toBeNull();
    expect(screen.getByText(/不代表沒有總經發布/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("搜尋總經事件"), {
      target: { value: "CPI" },
    });
    fireEvent.click(screen.getByRole("button", { name: "30 天" }));
    expect(screen.getByText(/2026-11-23 ～ 2026-12-22/)).toBeTruthy();
  });
  it("失敗快照明示沿用舊資料，超出涵蓋範圍不冒充沒有事件", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            ...data,
            status: "failed",
            lastSuccessAt: "2026-11-21T00:00:00Z",
          }),
        }),
    );
    render(<CalendarPanel date="2026-11-23" />);
    await screen.findByText("美國-CPI");
    expect(screen.getByText(/本次來源更新未成功/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("日曆起始日期"), {
      target: { value: "2028-01-01" },
    });
    expect(screen.getByText(/超出已同步範圍/)).toBeTruthy();
  });
  it("總覽近期事件能開啟完整日曆，讀取錯誤能重試", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue({ ok: true, json: async () => data });
    vi.stubGlobal("fetch", fetcher);
    const onOpen = vi.fn();
    render(<CalendarPanel compact date="2026-11-23" onOpen={onOpen} />);
    await screen.findByText(/日曆讀取失敗/);
    fireEvent.click(screen.getByText("重試日曆"));
    await screen.findByText("美國-CPI");
    fireEvent.click(screen.getByText("查看完整日曆 →"));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
