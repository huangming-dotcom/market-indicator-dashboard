// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCnnFearGreed, CNN_URL } from "../scripts/cnn-fear-greed.mjs";
import { validateDataset } from "../src/schema.mjs";
import { mergeObservations } from "../scripts/lib.mjs";
import { snapshot, regime } from "../src/analytics";
import { dataset } from "./fixtures";
const ctx = {
  url: CNN_URL,
  retrievedAt: "2026-11-21T08:00:00Z",
  rawHash: "synthetic-only",
};
const payload = () => ({
  fear_and_greed: {
    score: 10,
    rating: "extreme fear",
    timestamp: "2026-11-20T23:59:52+00:00",
    previous_close: 30,
  },
  fear_and_greed_historical: {
    data: [
      { x: Date.parse("2026-11-19T00:00:00Z"), y: 20, rating: "fear" },
      { x: Date.parse("2026-11-20T00:00:00Z"), y: 10, rating: "extreme fear" },
      { x: Date.parse("2026-11-20T23:59:52Z"), y: 10, rating: "extreme fear" },
    ],
  },
});
const parse = (p = payload(), end = "2026-11-21") =>
  parseCnnFearGreed(JSON.stringify(p), ctx, "2026-11-01", end);
describe("CNN 官方恐懼貪婪資料", () => {
  it("同日歷史與最新快照去重，前收比較採 CNN 欄位而非歷史前值", () => {
    const rows = parse();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      metricId: "fearGreed",
      date: "2026-11-20",
      value: 10,
      sentiment: {
        rating: "extreme fear",
        previousClose: 30,
        updatedAt: "2026-11-20T23:59:52.000Z",
      },
    });
    expect(validateDataset(dataset(rows)).observations).toHaveLength(2);
    expect(snapshot(dataset(rows), "fearGreed", "2026-11-21").change).toBe(-20);
  });
  it("午夜 UTC 是 CNN 歷史日期錨點，不誤退成紐約前一日", () => {
    expect(parse()[0].date).toBe("2026-11-19");
  });
  it("零分有效，null 歷史保留缺值而不補零", () => {
    const p = payload();
    p.fear_and_greed.score = 0;
    p.fear_and_greed.previous_close = 0;
    p.fear_and_greed_historical.data[0].y = null as unknown as number;
    const rows = parse(p);
    expect(rows[0]).toMatchObject({ value: null, status: "missing" });
    expect(rows[1].value).toBe(0);
    expect(snapshot(dataset(rows), "fearGreed", "2026-11-21").change).toBe(0);
  });
  it("拒絕超範圍分數、未知分類與未來更新時間", () => {
    const p = payload();
    p.fear_and_greed.score = 101;
    expect(() => parse(p)).toThrow();
    p.fear_and_greed.score = 10;
    p.fear_and_greed.rating = "unknown";
    expect(() => parse(p)).toThrow();
    p.fear_and_greed.rating = "fear";
    p.fear_and_greed.timestamp = "2026-12-01T12:00:00Z";
    expect(() => parse(p)).toThrow();
  });
  it("日期切換只包含該日前歷史，不套未來主指數的前收基準", () => {
    const rows = parse(payload(), "2026-11-19");
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(20);
    expect(rows[0].sentiment.previousClose).toBeUndefined();
  });
  it("相同內容重抓冪等，分數相同但更新時間變更保留新版本", () => {
    const a = parse()[1];
    expect(mergeObservations([a], [a])).toHaveLength(1);
    expect(
      mergeObservations(
        [a],
        [
          {
            ...a,
            vintage: "2026-11-21T09:00:00Z",
            sentiment: { ...a.sentiment, updatedAt: "2026-11-20T23:59:53Z" },
          },
        ],
      ),
    ).toHaveLength(2);
  });
  it("schema 拒絕非 CNN 來源、超界與分類缺失，不將 CNN 納入 Regime", () => {
    const a = parse()[1];
    expect(() =>
      validateDataset(
        dataset([
          { ...a, source: { name: "wrong", url: "https://example.com/" } },
        ]),
      ),
    ).toThrow();
    expect(() => validateDataset(dataset([{ ...a, value: -1 }]))).toThrow();
    expect(() =>
      validateDataset(dataset([{ ...a, sentiment: undefined }])),
    ).toThrow();
    expect(regime(dataset([a]), "2026-11-21").coverage).toBe(0);
  });
});
