// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseGoogleFutures } from "../scripts/google-finance.mjs";
import { validateDataset } from "../src/schema.mjs";
import { mergeObservations } from "../scripts/lib.mjs";
import { snapshot } from "../src/analytics";
import { dataset } from "./fixtures";
const ctx = {
  url: "https://www.google.com/finance/quote/CLW00:NYMEX",
  retrievedAt: "2026-11-21T08:00:00Z",
  rawHash: "synthetic-fixture",
};
const record = () => [
  "/g/test",
  ["CLW00", "NYMEX"],
  "Crude Oil",
  4,
  "USD",
  [101.5, 1.5, 1.5],
  null,
  100,
  null,
  null,
  null,
  [Date.parse("2026-11-20T22:50:00Z") / 1000],
];
const html = (r = record(), price = "101.50") =>
  `<title>Crude Oil Future Contract Prices - Google Finance</title><link rel="canonical" href="${ctx.url}"><div class="zhtAvb"><div class="N6SYTe">$${price}</div></div><script>AF_initDataCallback({key:'test',data:${JSON.stringify([[r]])}, sideChannel:{}});</script>`;
const parse = (body = html()) =>
  parseGoogleFutures(body, "wtiFutures", ctx, "2026-11-01", "2026-11-21");
describe("Google 原油期貨快照", () => {
  it("讀取最新報價而非結算，保留精確報價時間及來源 1D 基準", () => {
    const rows = parse();
    expect(rows[0]).toMatchObject({
      metricId: "wtiFutures",
      date: "2026-11-20",
      value: 101.5,
      sessionStatus: "snapshot",
      method: "market-data-api",
      quote: {
        symbol: "CLW00:NYMEX",
        quotedAt: "2026-11-20T22:50:00.000Z",
        referencePrice: 100,
        changePct: 1.5,
      },
    });
    expect(validateDataset(dataset(rows)).observations).toHaveLength(1);
    expect(snapshot(dataset(rows), "wtiFutures", "2026-11-21")).toMatchObject({
      change: 1.5,
      five: null,
      previous: undefined,
    });
  });
  it("不把其他頁面、幣別、商品類型或側欄報價當成指定期貨", () => {
    expect(() =>
      parseGoogleFutures(
        html(),
        "brentFutures",
        ctx,
        "2026-11-01",
        "2026-11-21",
      ),
    ).toThrow();
    for (const [index, value] of [
      [3, 1],
      [4, "TWD"],
    ] as const) {
      const r = record();
      r[index] = value;
      expect(() => parse(html(r))).toThrow();
    }
    expect(() => parse(html().replace("N6SYTe", "sidebar-price"))).toThrow();
    expect(() => parse("<title>Unsupported</title>")).toThrow();
  });
  it("拒絕畫面與資料價格不一致、比較基準不一致或未來報價時間", () => {
    expect(() => parse(html(record(), "105.00"))).toThrow();
    expect(() =>
      parse(html().replace("101.5,1.5,1.5", "101.5,8,1.5")),
    ).toThrow();
    expect(() =>
      parseGoogleFutures(
        html(),
        "wtiFutures",
        { ...ctx, retrievedAt: "2026-11-20T20:00:00Z" },
        "2026-11-01",
        "2026-11-21",
      ),
    ).toThrow();
  });
  it("安全讀取 JSON 資料，不執行頁面程式；區間以報價觀測日篩選", () => {
    expect(
      parse(
        html().replace(
          "</script>",
          "throw new Error('must not execute');</script>",
        ),
      ),
    ).toHaveLength(1);
    expect(
      parseGoogleFutures(html(), "wtiFutures", ctx, "2026-11-01", "2026-11-19"),
    ).toHaveLength(0);
  });
  it("同價但報價時間變更新增版本，相同快照重抓不新增", () => {
    const a = parse()[0];
    expect(
      mergeObservations([a], [{ ...a, vintage: "2026-11-21T09:00:00Z" }]),
    ).toHaveLength(1);
    expect(
      mergeObservations(
        [a],
        [
          {
            ...a,
            vintage: "2026-11-21T09:00:00Z",
            quote: { ...a.quote, quotedAt: "2026-11-20T22:51:00Z" },
          },
        ],
      ),
    ).toHaveLength(2);
  });
  it("資料契約拒絕不符商品、來源日期或缺少報價基準的快照", () => {
    const a = parse()[0];
    expect(() =>
      validateDataset(dataset([{ ...a, quote: undefined }])),
    ).toThrow();
    expect(() =>
      validateDataset(dataset([{ ...a, date: "2026-11-19" }])),
    ).toThrow();
    expect(() =>
      validateDataset(
        dataset([{ ...a, quote: { ...a.quote, symbol: "BZW00:NYMEX" } }]),
      ),
    ).toThrow();
  });
});
