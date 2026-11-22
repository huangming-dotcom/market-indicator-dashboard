import { fetchArchived, observation } from "./lib.mjs";

export function parseYahooFxQuote(body, ctx, start, end) {
  const j = JSON.parse(body),
    meta = j.chart?.result?.[0]?.meta;
  if (
    j.chart?.error ||
    !meta ||
    meta.symbol !== "USDTWD=X" ||
    meta.instrumentType !== "CURRENCY" ||
    meta.currency !== "TWD" ||
    meta.exchangeTimezoneName !== "Europe/London"
  )
    throw new Error("Yahoo 主報價商品／幣別／時區不符");
  const value = meta.regularMarketPrice,
    stamp = meta.regularMarketTime;
  // chartPreviousClose depends on the requested chart range. Never use it as yesterday's quote.
  const change = Number.isFinite(meta.regularMarketChange)
    ? meta.regularMarketChange
    : meta.fulldayChange;
  const pct = meta.regularMarketChangePercent;
  if (
    ![value, stamp, change, pct].every(Number.isFinite) ||
    value <= 0 ||
    stamp <= 0
  )
    throw new Error("Yahoo 主報價缺少價格、時間或同源漲跌");
  if (
    !Number.isFinite(meta.regularMarketChange) &&
    (!Number.isFinite(meta.fulldayPrice) ||
      Math.abs(meta.fulldayPrice - value) > 0.00005)
  )
    throw new Error("Yahoo 當日漲跌與主報價口徑不一致");
  const reference = value - change;
  if (reference <= 0 || Math.abs((change / reference) * 100 - pct) > 0.001)
    throw new Error("Yahoo 主報價漲跌與比較基準不一致");
  const quotedAt = new Date(stamp * 1000).toISOString();
  if (Date.parse(quotedAt) > Date.parse(ctx.retrievedAt))
    throw new Error("Yahoo 主報價時間來自未來");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(quotedAt));
  if (date < start || date > end) return [];
  const round = (n) => Math.round(n * 10000) / 10000;
  return [
    observation("usdtwdQuote", date, round(value), ctx, {
      source: { name: "Yahoo Finance · USD/TWD 主報價", url: ctx.url },
      market: "FX",
      timezone: "Europe/London",
      method: "market-data-api",
      sessionStatus: "snapshot",
      quote: {
        symbol: "USDTWD=X",
        quotedAt,
        referencePrice: round(reference),
        change: round(change),
        changePct: round(pct),
      },
      evidence:
        "採 regularMarketPrice／regularMarketTime／regularMarketChangePercent；漲跌採同源 regularMarketChange 或與主報價相符的 fulldayChange；比較基準由主報價減同源漲跌計算。不使用日線 close 或依查詢範圍改變的 chartPreviousClose。非台北外匯收盤。",
    }),
  ];
}
export async function yahooFxQuote(start, end) {
  let error;
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const ctx = await fetchArchived(
        `https://${host}/v8/finance/chart/USDTWD%3DX?range=5d&interval=1d`,
      );
      return parseYahooFxQuote(ctx.body, ctx, start, end);
    } catch (e) {
      error = e;
    }
  }
  throw error;
}
