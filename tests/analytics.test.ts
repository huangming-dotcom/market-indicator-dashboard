import { describe, expect, it } from "vitest";
import {
  alerts,
  breadth,
  delta,
  history,
  regime,
  snapshot,
  volumeRatio,
  calendarDays,
} from "../src/analytics";
import { dataset, obs } from "./fixtures";
describe("交易觀測與缺值", () => {
  it("週末用最近交易觀測，前值取同一序列，不用昨日曆日", () => {
    const d = dataset([
      obs("taiex", "2026-11-19", 100),
      obs("taiex", "2026-11-20", 101),
    ]);
    expect(snapshot(d, "taiex", "2026-11-21").previous?.date).toBe(
      "2026-11-19",
    );
    expect(snapshot(d, "taiex", "2026-11-21").change).toBe(1);
  });
  it("缺值不轉成零，也不跨越缺值冒充單日變化", () => {
    const d = dataset([
      obs("taiex", "2026-11-18", 100),
      obs("taiex", "2026-11-19", null),
      obs("taiex", "2026-11-20", 102),
    ]);
    expect(snapshot(d, "taiex", "2026-11-20").change).toBeNull();
  });
  it("bp 與 pp 不混淆，百分比前值為零不產生無限值", () => {
    expect(
      delta(
        obs("us10y", "2026-11-20", 4.1),
        obs("us10y", "2026-11-19", 4),
        "us10y",
      ),
    ).toBeCloseTo(10);
    expect(
      delta(
        obs("nvMargin", "2026-11-20", 75),
        obs("nvMargin", "2026-10-19", 70),
        "nvMargin",
      ),
    ).toBe(5);
    expect(
      delta(
        obs("sp500", "2026-11-20", 1),
        obs("sp500", "2026-11-19", 0),
        "sp500",
      ),
    ).toBeNull();
  });
  it("無 6 筆觀測時不能算 5 日變化", () => {
    const dates = ["12", "13", "16", "17", "18", "19"].map(
      (x) => "2026-11-" + x,
    );
    const d = dataset(dates.map((x, i) => obs("us2y", x, 4 + i * 0.01)));
    expect(snapshot(d, "us2y", "2026-11-18").five).toBeNull();
    expect(snapshot(d, "us2y", "2026-11-19").five).toBeCloseTo(5);
  });
  it("不同 Fed 會議不比較", () => {
    expect(
      delta(
        obs("fedCut", "2026-11-20", 70, { meetingDate: "2026-12-09" }),
        obs("fedCut", "2026-11-19", 50, { meetingDate: "2027-01-27" }),
        "fedCut",
      ),
    ).toBeNull();
  });
  it("不讀取選定日以後的數據或已知未發布值", () => {
    const d = dataset([
      obs("taiex", "2026-11-19", 100),
      obs("taiex", "2026-11-20", 110),
      obs("nvRevenue", "2026-10-31", 99, {
        publishedAt: "2026-11-20T22:00:00Z",
        period: "FY27Q3",
      }),
    ]);
    expect(snapshot(d, "taiex", "2026-11-19").current?.value).toBe(100);
    expect(snapshot(d, "nvRevenue", "2026-11-20").current).toBeUndefined();
  });
  it("歷史修訂保留 vintage，畫面選最新版本且不重複日期", () => {
    const d = dataset([
      obs("taiex", "2026-11-19", 100),
      obs("taiex", "2026-11-19", 101, { vintage: "2026-11-21T09:00:00Z" }),
    ]);
    expect(history(d, "taiex", "2026-11-20")).toHaveLength(1);
    expect(history(d, "taiex", "2026-11-20")[0].value).toBe(101);
  });
  it("逾期值不參與判讀", () => {
    expect(
      snapshot(
        dataset([obs("taiex", "2026-11-10", 100)]),
        "taiex",
        "2026-11-21",
      ).valid,
    ).toBe(false);
  });
});
describe("市場結構與風險", () => {
  it("上漲與下跌家數必須同日，零分母無廣度", () => {
    expect(
      breadth(
        dataset([
          obs("advancers", "2026-11-19", 8),
          obs("decliners", "2026-11-20", 2),
        ]),
        "2026-11-20",
      ),
    ).toBeNull();
    expect(
      breadth(
        dataset([
          obs("advancers", "2026-11-20", 0),
          obs("decliners", "2026-11-20", 0),
        ]),
        "2026-11-20",
      ),
    ).toBeNull();
    expect(
      breadth(
        dataset([
          obs("advancers", "2026-11-20", 8),
          obs("decliners", "2026-11-20", 2),
        ]),
        "2026-11-20",
      ),
    ).toBe(80);
  });
  it("20 日均量含當日；不足或含缺值不得輸出", () => {
    const dates = calendarDays("2026-11-20", 20);
    const d = dataset(dates.map((date) => obs("volume", date, 10)));
    expect(volumeRatio(d, "2026-11-20")?.ratio).toBe(1);
    expect(
      volumeRatio(dataset(d.observations.slice(1)), "2026-11-20"),
    ).toBeNull();
    d.observations[3].value = null;
    expect(volumeRatio(d, "2026-11-20")).toBeNull();
  });
  it("缺值不當 Neutral，至少四個輸入且時間一致", () => {
    expect(regime(dataset(), "2026-11-20").label).toBe("資料不足");
    const rows = ["sp500", "nasdaq", "taiex", "usdtwdQuote"].flatMap((id) => [
      obs(id, "2026-11-19", 100),
      obs(
        id,
        "2026-11-20",
        id === "usdtwdQuote" ? 99 : 101,
        id === "usdtwdQuote"
          ? {
              quote: {
                symbol: "USDTWD=X",
                quotedAt: "2026-11-20T12:00:00Z",
                referencePrice: 100,
                change: -1,
                changePct: -1,
              },
            }
          : {},
      ),
    ]);
    expect(regime(dataset(rows), "2026-11-20").label).toBe("Risk-on");
    const staleDate = rows.map((o) =>
      o.metricId === "usdtwdQuote"
        ? { ...o, date: o.date === "2026-11-19" ? "2026-11-14" : "2026-11-15" }
        : o,
    );
    expect(regime(dataset(staleDate), "2026-11-20").label).toBe("資料不足");
  });
  it("異常門檻含等號，沒有前值不捏造警報", () => {
    expect(
      alerts(
        dataset([
          obs("taiex", "2026-11-19", 100),
          obs("taiex", "2026-11-20", 98),
        ]),
        "2026-11-20",
      ).some((a) => a.kind === "market"),
    ).toBe(true);
    expect(
      alerts(dataset([obs("taiex", "2026-11-20", 98)]), "2026-11-20").filter(
        (a) => a.kind === "market",
      ),
    ).toHaveLength(0);
  });
});
