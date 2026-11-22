import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  it("CNN 卡顯示來源分類、0–100 色帶、前收基準及更新時間，詳情保留原始精度", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () =>
        dataset([
          obs("fearGreed", "2026-11-20", 24.5, {
            source: {
              name: "CNN Fear & Greed Index",
              url: "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
            },
            sentiment: {
              rating: "extreme fear",
              previousClose: 30,
              updatedAt: "2026-11-20T23:59:52Z",
            },
          }),
        ]),
    } as Response);
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    const card = screen.getByLabelText("檢視CNN Fear & Greed Index詳細資料");
    expect(card.textContent).toContain("極度恐懼");
    expect(card.textContent).toContain("CNN 前收基準 30");
    expect(
      within(card).getByRole("img", {
        name: "恐懼與貪婪指數 25／100，極度恐懼",
      }),
    ).toBeTruthy();
    expect(card.textContent).toContain("CNN 更新");
    fireEvent.click(card);
    const detail = within(
      screen.getByRole("dialog", { name: "CNN Fear & Greed Index" }),
    );
    expect(detail.getByText("24.5000／100（卡片四捨五入）")).toBeTruthy();
    expect(detail.getByText("基準日期未提供")).toBeTruthy();
    expect(
      detail.getByRole("link", { name: "CNN Fear & Greed Index" }),
    ).toBeTruthy();
  });
  it("匯率主報價與 Yahoo 畫面一致，詳情說明歷史圖為獨立日線", async () => {
    const quote = {
      symbol: "USDTWD=X",
      quotedAt: "2026-11-20T22:36:29Z",
      referencePrice: 32.947,
      change: 0.011,
      changePct: 0.0334,
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () =>
        dataset([
          obs("usdtwd", "2026-11-20", 33.0263),
          obs("usdtwdQuote", "2026-11-20", 32.958, {
            quote,
            sessionStatus: "snapshot",
            method: "market-data-api",
            source: {
              name: "Yahoo 主報價",
              url: "https://query1.finance.yahoo.com/v8/finance/chart/USDTWD%3DX?range=5d",
            },
          }),
        ]),
    } as Response);
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    const card = screen.getByLabelText("檢視美元／新台幣詳細資料");
    expect(card.textContent).toContain("32.958");
    expect(card.textContent).not.toContain("33.026");
    expect(card.textContent).toContain("+0.03 %");
    expect(card.textContent).toContain("Yahoo 當日（來源基準）");
    fireEvent.click(card);
    expect(
      within(screen.getByRole("dialog", { name: "美元／新台幣" })).getByText(
        "此圖為 Yahoo 歷史日線，與卡片主報價及當日漲跌分列。",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/0.0110/)).toBeTruthy();
  });
  it("Google 期貨卡顯示價格、來源 1D、來源基準與報價時間，與現貨分列", async () => {
    const quote = {
      symbol: "CLW00:NYMEX",
      quotedAt: "2026-11-20T22:50:00Z",
      referencePrice: 100,
      change: 1.5,
      changePct: 1.5,
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () =>
        dataset([
          obs("wtiFutures", "2026-11-20", 101.5, {
            quote,
            sessionStatus: "snapshot",
            method: "market-data-api",
            source: {
              name: "Google Finance",
              url: "https://www.google.com/finance/quote/CLW00:NYMEX",
            },
          }),
        ]),
    } as Response);
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    const card = screen.getByLabelText("檢視WTI 原油期貨・Google詳細資料");
    expect(card.textContent).toContain("101.50");
    expect(card.textContent).toContain("+1.50 %");
    expect(card.textContent).toContain("Google 1D（來源基準）");
    expect(card.textContent).toContain("來源基準 100.00");
    expect(card.textContent).toContain("報價快照");
    expect(
      screen.getByLabelText("檢視布蘭特原油期貨・Google詳細資料"),
    ).toBeTruthy();
    expect(screen.getByLabelText("檢視WTI 原油現貨詳細資料")).toBeTruthy();
    fireEvent.click(card);
    expect(await screen.findByText("來源報價時間")).toBeTruthy();
    expect(screen.getByText(/行情報價快照/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Google Finance" }).getAttribute("href"),
    ).toContain("CLW00:NYMEX");
  });
  it("總覽預設顯示兩張原油現貨卡、更新時段與分開標示的 Google 期貨連結", async () => {
    render(<App />);
    await screen.findByText("今日與前一交易觀測");
    expect(screen.getByLabelText("檢視WTI 原油現貨詳細資料")).toBeTruthy();
    expect(
      screen.getByLabelText("檢視布蘭特 Brent 原油現貨詳細資料"),
    ).toBeTruthy();
    expect(screen.getByLabelText("資料更新時間說明").textContent).toContain(
      "07:00／09:00／17:30／22:30",
    );
    expect(
      screen.getByRole("link", { name: "WTI 期貨" }).getAttribute("href"),
    ).toBe("https://www.google.com/finance/quote/CLW00:NYMEX");
    fireEvent.click(screen.getByLabelText("檢視WTI 原油現貨詳細資料"));
    expect(
      await screen.findByRole("link", { name: /Google Finance WTI 期貨參考/ }),
    ).toBeTruthy();
  });
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
