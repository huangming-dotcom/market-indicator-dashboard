import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import DailySummary from "../src/DailySummary";
import { RADAR_THREAD } from "../src/reports.mjs";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const originalText =
  "# 市場指標雷達\n\n2026/11/23\n\n## 五行摘要\n\n" +
  "資料缺值，待複核。".repeat(20) +
  "\n\n<script>alert('xss')</script>\n\n[危險](javascript:alert(1))\n\n| 指標 | 狀態 |\n| --- | --- |\n| FedWatch | 缺值 |\n\n本報告不構成投資建議。";
const archive = {
  schemaVersion: 1,
  source: { threadId: RADAR_THREAD, title: "市場指標雷達" },
  reports: [
    {
      date: "2026-11-23",
      revision: "a".repeat(64),
      importedAt: "2026-11-23T02:00:00Z",
      title: "市場指標雷達",
      messageIds: ["message"],
      originalText,
    },
  ],
};
describe("每日摘要閱讀", () => {
  it("顯示原文警示、表格與同步日期；不執行 HTML 或危險連結", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => archive }),
    );
    const { container } = render(
      <DailySummary date="2026-11-23" onDate={() => {}} refreshKey="first" />,
    );
    await screen.findByText("五行摘要");
    expect(screen.getByText("原文封存 · 尚未逐項複核")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "FedWatch" })).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("危險").getAttribute("href")).not.toMatch(
      /^javascript:/,
    );
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      "reports/daily-market.json",
    );
  });
  it("無當日摘要時明示待同步，使用者選擇後才查看前日", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => archive }),
    );
    const onDate = vi.fn();
    render(
      <DailySummary date="2026-11-24" onDate={onDate} refreshKey="first" />,
    );
    await screen.findByText("2026-11-24 尚未同步每日摘要");
    expect(screen.queryByText("五行摘要")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "查看最新摘要（2026-11-23）" }),
    );
    expect(onDate).toHaveBeenCalledWith("2026-11-23");
    fireEvent.change(screen.getByRole("combobox", { name: "歷史摘要日期" }), {
      target: { value: "2026-11-23" },
    });
    expect(onDate).toHaveBeenCalledTimes(2);
  });
  it("重新載入失敗保留已成功內容並可重試", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => archive })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue({ ok: true, json: async () => archive });
    vi.stubGlobal("fetch", fetcher);
    const { rerender } = render(
      <DailySummary date="2026-11-23" onDate={() => {}} refreshKey="first" />,
    );
    await screen.findByText("五行摘要");
    rerender(
      <DailySummary date="2026-11-23" onDate={() => {}} refreshKey="second" />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "保留上次成功載入內容",
    );
    expect(screen.getByText("五行摘要")).toBeTruthy();
    fireEvent.click(screen.getByText("重試摘要"));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
