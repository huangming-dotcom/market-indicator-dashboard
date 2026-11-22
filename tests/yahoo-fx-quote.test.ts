// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseYahooFxQuote } from "../scripts/yahoo-fx-quote.mjs";
import { validateDataset } from "../src/schema.mjs";
import { snapshot, regime, history } from "../src/analytics";
import { dataset, obs } from "./fixtures";
const ctx = {
  url: "https://query1.finance.yahoo.com/v8/finance/chart/USDTWD%3DX?range=5d&interval=1d",
  retrievedAt: "2026-11-21T08:00:00Z",
  rawHash: "test-only",
};
const meta = () => ({
  symbol: "USDTWD=X",
  instrumentType: "CURRENCY",
  currency: "TWD",
  exchangeTimezoneName: "Europe/London",
  regularMarketPrice: 32.958,
  regularMarketTime: Date.parse("2026-11-20T22:36:29Z") / 1000,
  regularMarketChangePercent: 0.0334,
  fulldayPrice: 32.958,
  fulldayChange: 0.011,
  chartPreviousClose: 30,
});
const body = (m = meta()) =>
  JSON.stringify({
    chart: {
      result: [
        {
          meta: m,
          timestamp: [1795132800],
          indicators: { quote: [{ close: [33.0263] }] },
        },
      ],
      error: null,
    },
  });
const parse = (b = body()) =>
  parseYahooFxQuote(b, ctx, "2026-11-01", "2026-11-21");
describe("Yahoo 匯率主報價", () => {
  it("主報價與日線不同時採主報價及原始報價時間，漲跌亦同源", () => {
    const rows = parse();
    expect(rows[0]).toMatchObject({
      metricId: "usdtwdQuote",
      value: 32.958,
      date: "2026-11-20",
      sessionStatus: "snapshot",
      quote: {
        quotedAt: "2026-11-20T22:36:29.000Z",
        referencePrice: 32.947,
        change: 0.011,
        changePct: 0.0334,
      },
    });
    expect(validateDataset(dataset(rows)).observations).toHaveLength(1);
  });
  it("不使用隨查詢範圍改變的 chartPreviousClose，也不拿歷史日線補主報價", () => {
    expect(
      parse(body({ ...meta(), chartPreviousClose: 100 }))[0].quote
        .referencePrice,
    ).toBe(32.947);
    expect(() =>
      parse(
        body({
          ...meta(),
          regularMarketPrice: undefined,
        } as unknown as ReturnType<typeof meta>),
      ),
    ).toThrow();
  });
  it("零漲跌有效；不一致的當日價格、幣別及漲跌會拒絕", () => {
    expect(
      parse(
        body({ ...meta(), fulldayChange: 0, regularMarketChangePercent: 0 }),
      )[0].quote.change,
    ).toBe(0);
    expect(() => parse(body({ ...meta(), fulldayPrice: 33 }))).toThrow();
    expect(() => parse(body({ ...meta(), currency: "USD" }))).toThrow();
    expect(() =>
      parse(body({ ...meta(), regularMarketChangePercent: 5 })),
    ).toThrow();
  });
  it("拒絕未來報價；以來源日期篩選而非擷取時間", () => {
    expect(() =>
      parseYahooFxQuote(
        body(),
        { ...ctx, retrievedAt: "2026-11-20T20:00:00Z" },
        "2026-11-01",
        "2026-11-21",
      ),
    ).toThrow();
    expect(
      parseYahooFxQuote(body(), ctx, "2026-11-21", "2026-11-21"),
    ).toHaveLength(0);
  });
  it("主報價漲跌、日線趨勢與風險輸入分列，缺主報價不退回日線冒充", () => {
    const d = dataset([obs("usdtwd", "2026-11-20", 33.0263), ...parse()]);
    expect(snapshot(d, "usdtwdQuote", "2026-11-21")).toMatchObject({
      change: 0.0334,
      five: null,
      previous: undefined,
    });
    expect(history(d, "usdtwd", "2026-11-21")[0].value).toBe(33.0263);
    expect(
      snapshot(
        dataset([obs("usdtwd", "2026-11-20", 33.0263)]),
        "usdtwdQuote",
        "2026-11-21",
      ).valid,
    ).toBe(false);
    expect(
      regime(d, "2026-11-21").inputs.find((x) => x.id === "usdtwdQuote")?.score,
    ).toBe(0);
  });
});
