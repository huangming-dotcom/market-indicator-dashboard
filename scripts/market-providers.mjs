import { parse } from "csv-parse/sync";
import { fetchArchived, observation, numeric, rocDate } from "./lib.mjs";
import { isCompletedSession } from "../src/sessions.mjs";

export const YAHOO = {
  usdtwd: {
    symbol: "TWD=X",
    market: "FX",
    timezone: "Europe/London",
    instrumentType: "CURRENCY",
    currency: "TWD",
    precision: 4,
  },
  sp500: { symbol: "^GSPC", market: "US", timezone: "America/New_York" },
  nasdaq: { symbol: "^IXIC", market: "US", timezone: "America/New_York" },
  sox: { symbol: "^SOX", market: "US", timezone: "America/New_York" },
  kospi: { symbol: "^KS11", market: "KR", timezone: "Asia/Seoul" },
  nikkei: { symbol: "^N225", market: "JP", timezone: "Asia/Tokyo" },
};
export function parseYahoo(body, id, ctx, start, end) {
  const config = YAHOO[id];
  const payload = JSON.parse(body);
  const result = payload.chart?.result?.[0];
  if (
    !config ||
    payload.chart.error ||
    !result ||
    result.meta.symbol !== config.symbol ||
    result.meta.instrumentType !== (config.instrumentType ?? "INDEX") ||
    (config.currency && result.meta.currency !== config.currency)
  )
    throw new Error("Yahoo 行情回應、報價幣別或代碼不符");
  if (result.meta.exchangeTimezoneName !== config.timezone)
    throw new Error("Yahoo 交易時區變動");
  const dates = result.timestamp;
  const quotes = result.indicators?.quote?.[0];
  if (
    !Array.isArray(dates) ||
    !Array.isArray(quotes?.close) ||
    dates.length !== quotes.close.length
  )
    throw new Error("Yahoo 收盤序列格式變動");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const seen = new Set();
  const currencyToday =
    config.instrumentType === "CURRENCY"
      ? formatter.format(new Date(ctx.retrievedAt))
      : null;
  return dates.flatMap((stamp, index) => {
    const date = formatter.format(new Date(stamp * 1000));
    if (
      date < start ||
      date > end ||
      (currencyToday
        ? date >= currencyToday ||
          [0, 6].includes(new Date(date + "T12:00:00Z").getUTCDay())
        : !isCompletedSession(config.market, date, ctx.retrievedAt))
    )
      return [];
    if (seen.has(date)) throw new Error("Yahoo 交易日重複");
    seen.add(date);
    const raw = quotes.close[index];
    if (raw !== null && (!Number.isFinite(raw) || raw <= 0))
      throw new Error("Yahoo 收盤值無效");
    const scale = 10 ** (config.precision ?? 2);
    const value = raw === null ? null : Math.round(raw * scale) / scale;
    const high = quotes.high?.[index],
      low = quotes.low?.[index];
    if (
      value !== null &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      (value > high + 0.02 || value < low - 0.02)
    )
      throw new Error("Yahoo 收盤超出高低價範圍");
    return [
      observation(id, date, value, ctx, {
        source: { name: "Yahoo Finance · " + config.symbol, url: ctx.url },
        market: config.market,
        timezone: config.timezone,
        method: "market-data-api",
        sessionStatus: "close",
        evidence: currencyToday
          ? "Yahoo USD/TWD 來源時區已結束日線；1 USD 對應 TWD，非台北外匯收盤；不使用盤中 regularMarketPrice"
          : "未調整日線收盤；已按交易日曆排除尚未收盤日",
      }),
    ];
  });
}
export async function yahoo(start, end, id) {
  const symbol = encodeURIComponent(YAHOO[id].symbol);
  const period1 = Math.floor(Date.parse(start + "T00:00:00Z") / 1000) - 86400;
  const period2 = Math.floor(Date.parse(end + "T00:00:00Z") / 1000) + 2 * 86400;
  let error;
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const ctx = await fetchArchived(
        `https://${host}/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history&includePrePost=false`,
      );
      return parseYahoo(ctx.body, id, ctx, start, end);
    } catch (e) {
      error = e;
    }
  }
  throw error;
}
export function parseTaifex(body, ctx, start, end) {
  const records = body.trim().startsWith("[")
    ? JSON.parse(body)
    : parse(body, { columns: true, bom: true, skip_empty_lines: true });
  if (!Array.isArray(records)) throw new Error("TAIFEX 回應不是資料陣列");
  const rows = records.filter(
    (row) =>
      ["臺股期貨", "台股期貨", "TX"].includes(row.ContractCode) &&
      ["外資及陸資", "外資"].includes(row.Item),
  );
  if (!rows.length) throw new Error("TAIFEX 缺少 TX 外資資料");
  return rows
    .filter((row) => rocDate(row.Date) >= start && rocDate(row.Date) <= end)
    .map((row) => {
      const long = numeric(row["OpenInterest(Long)"]),
        short = numeric(row["OpenInterest(Short)"]),
        net = numeric(row["OpenInterest(Net)"]);
      if (
        long === null ||
        short === null ||
        net === null ||
        long - short !== net
      )
        throw new Error("TAIFEX 未平倉多空淨額不一致");
      return observation("futures", rocDate(row.Date), net, ctx, {
        sessionStatus: "close",
        evidence:
          "臺股期貨（TX）外資及陸資；未平倉多方減空方，不含交易量多空淨額",
      });
    });
}
export async function taifex(start, end) {
  const ctx = await fetchArchived(
    "https://openapi.taifex.com.tw/v1/MarketDataOfMajorInstitutionalTradersDetailsOfFuturesContractsBytheDate",
  );
  return parseTaifex(ctx.body, ctx, start, end);
}
export function parseTpexFlow(body, ctx, start, end) {
  const rows = JSON.parse(body);
  if (!Array.isArray(rows)) throw new Error("TPEX 法人格式變動");
  const foreign = rows.filter(
    (row) => row.Investor?.trim() === "外資及陸資(不含自營商)",
  );
  if (!foreign.length) throw new Error("TPEX 缺少外資列");
  return foreign
    .filter((row) => rocDate(row.Date) >= start && rocDate(row.Date) <= end)
    .map((row) => {
      const buy = numeric(row.PurchaseAmount),
        sell = numeric(row.SaleAmount),
        net = numeric(row.Net);
      if (
        buy === null ||
        sell === null ||
        net === null ||
        Math.abs(buy - sell - net) > 1
      )
        throw new Error("TPEX 法人買賣超不一致");
      return observation("foreignOtc", rocDate(row.Date), net / 1e8, ctx, {
        sessionStatus: "close",
      });
    });
}
export async function tpexFlow(start, end) {
  const ctx = await fetchArchived(
    "https://www.tpex.org.tw/openapi/v1/tpex_3insti_summary",
  );
  return parseTpexFlow(ctx.body, ctx, start, end);
}
export function parseTpexFlowHistory(body, ctx, date) {
  const payload = JSON.parse(body);
  if (payload.stat !== "ok" || payload.date !== date.replaceAll("-", ""))
    throw new Error("TPEX 法人歷史日期不符");
  const t = payload.tables?.find((t) => t.fields?.includes("買賣超(元)"));
  const row = t?.data?.find(
    (row) => row[0]?.trim() === "外資及陸資(不含自營商)",
  );
  if (!row) throw new Error("TPEX 法人歷史缺少外資列");
  const buy = numeric(row[1]),
    sell = numeric(row[2]),
    net = numeric(row[3]);
  if (
    buy === null ||
    sell === null ||
    net === null ||
    Math.abs(buy - sell - net) > 1
  )
    throw new Error("TPEX 法人歷史金額不一致");
  return [
    observation("foreignOtc", date, net / 1e8, ctx, { sessionStatus: "close" }),
  ];
}
export async function tpexFlowHistory(dates) {
  const rows = [];
  for (const date of dates) {
    const ctx = await fetchArchived(
      `https://www.tpex.org.tw/www/zh-tw/insti/summary?date=${date.replaceAll("-", "/")}&type=Daily&response=json`,
    );
    rows.push(...parseTpexFlowHistory(ctx.body, ctx, date));
  }
  return rows;
}
export function parseTpexBreadth(body, ctx, date) {
  const j = JSON.parse(body);
  if (j.stat !== "ok" || j.date !== date.replaceAll("-", ""))
    throw new Error("TPEX 行情日期不符");
  const t = j.tables?.find(
    (t) => t.title === "上櫃股票行情" && t.fields?.includes("漲跌"),
  );
  if (!t?.data?.length) throw new Error("TPEX 行情缺少股票資料");
  const changeColumn = t.fields.indexOf("漲跌");
  let advances = 0,
    declines = 0,
    eligible = 0;
  for (const row of t.data) {
    if (!/^[1-9]\d{3}$/.test(row[0])) continue;
    const change = String(row[changeColumn]).trim();
    if (!/^[+-]?\d+(\.\d+)?$/.test(change)) continue;
    eligible++;
    if (Number(change) > 0) advances++;
    if (Number(change) < 0) declines++;
  }
  if (!eligible) throw new Error("TPEX 行情無可分類的四碼股票");
  return [
    ["advancersOtc", advances],
    ["declinersOtc", declines],
  ].map(([id, value]) =>
    observation(id, date, value, ctx, {
      sessionStatus: "close",
      evidence:
        "上櫃四碼股票之數字漲跌欄統計；排除 ETF、權證與除權息等無數字比價列",
    }),
  );
}
export async function tpexBreadth(dates) {
  const result = [];
  for (const date of dates) {
    const ctx = await fetchArchived(
      `https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes?date=${date.replaceAll("-", "/")}&response=json`,
    );
    result.push(...parseTpexBreadth(ctx.body, ctx, date));
  }
  return result;
}
export function parseTpexMargin(body, ctx, start, end) {
  const payload = JSON.parse(body);
  if (payload.stat !== "ok" || !Array.isArray(payload.trend))
    throw new Error("TPEX 儀表板融資格式變動");
  return payload.trend
    .filter((row) => rocDate(row.date) >= start && rocDate(row.date) <= end)
    .flatMap((row) => {
      const value = numeric(row.marginBalance);
      if (value === null) return [];
      return [
        observation("marginOtc", rocDate(row.date), value, ctx, {
          sessionStatus: "close",
          evidence:
            "TWSE 臺股儀表板使用的 TPEX dashboardOtc/marginTrend；marginBalance 單位億元",
        }),
        observation("tpex", rocDate(row.date), numeric(row.index), ctx, {
          sessionStatus: "close",
        }),
      ];
    });
}
export async function tpexMargin(start, end) {
  const d = `${Number(end.slice(0, 4)) - 1911}/${end.slice(5, 7)}/${end.slice(8)}`;
  const ctx = await fetchArchived(
    `https://www.tpex.org.tw/www/dashboardOtc/marginTrend?lang=zh-tw&days=150&date=${d}`,
  );
  return parseTpexMargin(ctx.body, ctx, start, end);
}
