// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectedSession, sessionLag } from "../src/sessions.mjs";
import { snapshot } from "../src/analytics";
import {
  parseYahoo,
  parseTaifex,
  parseTpexMargin,
  parseTpexBreadth,
  parseTpexFlowHistory,
} from "../scripts/market-providers.mjs";
import {
  parseFedRss,
  parseFedwatchSnapshot,
} from "../scripts/policy-providers.mjs";
import { mergeObservations } from "../scripts/lib.mjs";
import { obs, dataset } from "./fixtures";
const ctx = {
  url: "https://query1.finance.yahoo.com/test-fixture",
  retrievedAt: "2026-11-21T08:00:00Z",
  rawHash: "test-only",
};
const chart = (close: number | null = 100) =>
  JSON.stringify({
    chart: {
      result: [
        {
          meta: {
            symbol: "^SOX",
            instrumentType: "INDEX",
            exchangeTimezoneName: "America/New_York",
          },
          timestamp: [Date.parse("2026-11-20T14:30:00Z") / 1000],
          indicators: { quote: [{ close: [close], high: [110], low: [90] }] },
        },
      ],
      error: null,
    },
  });
describe("收盤交易日與時區", () => {
  it("漏抓中間交易日不能把兩日變化冒充一日，週末則可正常比較", () => {
    expect(
      snapshot(
        dataset([
          obs("sp500", "2026-11-18", 100),
          obs("sp500", "2026-11-20", 110),
        ]),
        "sp500",
        "2026-11-20",
      ).change,
    ).toBeNull();
    expect(
      snapshot(
        dataset([
          obs("sp500", "2026-11-13", 100),
          obs("sp500", "2026-11-16", 110),
        ]),
        "sp500",
        "2026-11-16",
      ).change,
    ).toBeCloseTo(10);
  });
  it("台灣週六早晨應取得美國週五收盤，不要求不存在的週六交易", () => {
    expect(
      expectedSession("US", "2026-11-21", "2026-11-21T00:30:00Z")?.date,
    ).toBe("2026-11-20");
    expect(
      expectedSession("TW", "2026-11-21", "2026-11-21T00:30:00Z")?.date,
    ).toBe("2026-11-20");
  });
  it("美國盤中不把當日 bar 當收盤，處理夏令時間與提早收盤", () => {
    expect(
      expectedSession("US", "2026-03-13", "2026-03-13T19:59:00Z")?.date,
    ).toBe("2026-03-12");
    expect(
      expectedSession("US", "2026-03-13", "2026-03-13T20:01:00Z")?.date,
    ).toBe("2026-03-13");
    expect(
      expectedSession("US", "2026-11-27", "2026-11-27T18:01:00Z")?.date,
    ).toBe("2026-11-27");
  });
  it("感恩節與日本假日不算落後交易日，超出日曆覆蓋範圍回傳未知", () => {
    expect(
      expectedSession("US", "2026-11-26", "2026-11-26T23:00:00Z")?.date,
    ).toBe("2026-11-25");
    expect(
      expectedSession("JP", "2026-11-23", "2026-11-23T10:00:00Z")?.date,
    ).toBe("2026-11-20");
    expect(
      expectedSession("US", "2030-11-21", "2030-11-21T23:00:00Z"),
    ).toBeNull();
    expect(sessionLag("US", "2026-11-25", "2026-11-27")).toBe(1);
  });
  it("落後一天即不可算最新，前一版七日內可用的行為已取消", () => {
    const s = snapshot(
      dataset([obs("sp500", "2026-11-19", 100)]),
      "sp500",
      "2026-11-20",
    );
    expect(s.stale).toBe(true);
    expect(s.valid).toBe(false);
    expect(s.expected).toBe("2026-11-20");
    expect(s.lag).toBe(1);
  });
});
describe("新增來源解析", () => {
  it("Yahoo 依原市場日期保存收盤且不使用調整後值", () => {
    const rows = parseYahoo(
      chart(100.123),
      "sox",
      ctx,
      "2026-11-01",
      "2026-11-21",
    );
    expect(rows[0]).toMatchObject({
      date: "2026-11-20",
      value: 100.12,
      method: "market-data-api",
      sessionStatus: "close",
      market: "US",
    });
  });
  it("Yahoo 尚未收盤的 bar 排除；代碼或高低價不一致拒絕", () => {
    expect(
      parseYahoo(
        chart(),
        "sox",
        { ...ctx, retrievedAt: "2026-11-20T17:00:00Z" },
        "2026-11-01",
        "2026-11-20",
      ),
    ).toHaveLength(0);
    expect(() =>
      parseYahoo(chart(200), "sox", ctx, "2026-11-01", "2026-11-21"),
    ).toThrow();
    expect(() =>
      parseYahoo(chart(), "kospi", ctx, "2026-11-01", "2026-11-21"),
    ).toThrow();
  });
  it("Yahoo 已完成交易日的 null 保留為缺值", () => {
    expect(
      parseYahoo(chart(null), "sox", ctx, "2026-11-01", "2026-11-21")[0],
    ).toMatchObject({ value: null, status: "missing" });
  });
  it("TAIFEX 只取 TX 外資未平倉，不能混用交易淨額", () => {
    const body = JSON.stringify([
      {
        Date: "20261120",
        ContractCode: "臺股期貨",
        Item: "外資及陸資",
        "OpenInterest(Long)": "10",
        "OpenInterest(Short)": "30",
        "OpenInterest(Net)": "-20",
        "TradingVolume(Net)": "999",
      },
    ]);
    expect(parseTaifex(body, ctx, "2026-11-01", "2026-11-21")[0].value).toBe(
      -20,
    );
    expect(() =>
      parseTaifex(
        body.replace('"-20"', '"-19"'),
        ctx,
        "2026-11-01",
        "2026-11-21",
      ),
    ).toThrow();
  });
  it("櫃買儀表板 marginBalance 為億元，保留指數歷史", () => {
    const rows = parseTpexMargin(
      JSON.stringify({
        stat: "ok",
        trend: [{ date: "20261120", marginBalance: 123.45, index: 200 }],
      }),
      ctx,
      "2026-11-01",
      "2026-11-21",
    );
    expect(rows.map((o) => o.value)).toEqual([123.45, 200]);
  });
  it("TPEX 廣度只統計四碼股票與數字漲跌，排除 ETF 與除權息", () => {
    const payload = {
      stat: "ok",
      date: "20261120",
      tables: [
        {
          title: "上櫃股票行情",
          fields: ["代號", "漲跌"],
          data: [
            ["1234", "1.2"],
            ["4321", "-3"],
            ["5555", "0"],
            ["006201", "1"],
            ["1235", "除息"],
          ],
        },
      ],
    };
    expect(
      parseTpexBreadth(JSON.stringify(payload), ctx, "2026-11-20").map(
        (o) => o.value,
      ),
    ).toEqual([1, 1]);
  });
  it("TPEX 法人元轉億元且拒絕回傳其他日期", () => {
    const payload = {
      stat: "ok",
      date: "20261120",
      tables: [
        {
          fields: ["單位名稱", "買進金額(元)", "賣出金額(元)", "買賣超(元)"],
          data: [
            [
              "外資及陸資(不含自營商)",
              "300,000,000",
              "100,000,000",
              "200,000,000",
            ],
          ],
        },
      ],
    };
    expect(
      parseTpexFlowHistory(JSON.stringify(payload), ctx, "2026-11-20")[0].value,
    ).toBe(2);
    expect(() =>
      parseTpexFlowHistory(JSON.stringify(payload), ctx, "2026-11-19"),
    ).toThrow();
  });
  it("滾動下載範圍改變不新增相同 vintage，FRED 不覆蓋 Yahoo 收盤", () => {
    const a = obs("sox", "2026-11-20", 100, {
      method: "market-data-api",
      source: {
        name: "Yahoo",
        url: "https://query1.finance.yahoo.com/chart?period1=1&period2=2",
      },
    });
    expect(
      mergeObservations(
        [a],
        [
          {
            ...a,
            source: {
              ...a.source,
              url: "https://query1.finance.yahoo.com/chart?period1=2&period2=3",
            },
          },
        ],
      ),
    ).toHaveLength(1);
    expect(
      mergeObservations(
        [a],
        [
          {
            ...a,
            method: "official-api",
            source: { name: "FRED", url: "https://fred.stlouisfed.org/data" },
          },
        ],
      ),
    ).toHaveLength(1);
  });
});
describe("政策機率與官方公告", () => {
  it("CME 情境依目前利率區間分類，同一快照完整合計 100%", () => {
    const p = {
      date: "2026-11-20",
      meetingDate: "2026-12-09",
      observedAt: "2026-11-20T22:00:00Z",
      currentTargetUpperBp: 400,
      scenarios: [
        { targetUpperBp: 375, probabilityPct: 10 },
        { targetUpperBp: 400, probabilityPct: 20 },
        { targetUpperBp: 425, probabilityPct: 65 },
        { targetUpperBp: 450, probabilityPct: 5 },
      ],
    };
    expect(
      parseFedwatchSnapshot(JSON.stringify(p), ctx, "2026-11-21").map(
        (o) => o.value,
      ),
    ).toEqual([10, 20, 70]);
    p.scenarios.pop();
    expect(() =>
      parseFedwatchSnapshot(JSON.stringify(p), ctx, "2026-11-21"),
    ).toThrow();
  });
  it("接近 100% 的報導不能作為 CME 數字快照匯入", () => {
    expect(() =>
      parseFedwatchSnapshot(
        JSON.stringify({ date: "2026-11-20", probability: "接近100%" }),
        ctx,
        "2026-11-21",
      ),
    ).toThrow();
  });
  it("Fed RSS 僅收官方 FOMC 公告，保留發布時間且排除未來公告", () => {
    const xml =
      "<rss><channel><item><title>Federal Reserve issues FOMC statement</title><link>https://www.federalreserve.gov/newsevents/test.htm</link><pubDate>Wed, 18 Nov 2026 19:00:00 GMT</pubDate></item></channel></rss>";
    expect(parseFedRss(xml, ctx, "2026-11-21")[0]).toMatchObject({
      kind: "fomc",
      confidence: "official",
      date: "2026-11-18",
    });
    expect(parseFedRss(xml, ctx, "2026-11-17")).toHaveLength(0);
  });
});
