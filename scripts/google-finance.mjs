import { load } from "cheerio";
import { fetchArchived, observation } from "./lib.mjs";

export const GOOGLE_FUTURES = { wtiFutures: "CLW00", brentFutures: "BZW00" };
export function parseGoogleFutures(body, id, ctx, start, end) {
  const symbol = GOOGLE_FUTURES[id];
  if (!symbol) throw new Error("未知 Google 原油指標");
  const $ = load(body);
  const canonical = new URL(
    $('link[rel="canonical"]').attr("href") ?? "https://invalid.example/",
  );
  if (
    canonical.hostname !== "www.google.com" ||
    decodeURIComponent(canonical.pathname) !==
      `/finance/quote/${symbol}:NYMEX` ||
    !/Future Contract.*Google Finance/.test($("title").text())
  )
    throw new Error("Google 回應不是指定期貨報價頁");
  const candidates = [];
  const visit = (node) => {
    if (!Array.isArray(node)) return;
    if (
      Array.isArray(node[1]) &&
      node[1][0] === symbol &&
      node[1][1] === "NYMEX" &&
      node[3] === 4 &&
      node[4] === "USD" &&
      Array.isArray(node[5])
    )
      candidates.push(node);
    else for (const child of node) visit(child);
  };
  for (const script of $("script").toArray()) {
    const text = $(script).text();
    if (!text.startsWith("AF_initDataCallback(") || !text.includes(symbol))
      continue;
    const match = text.match(/\bdata:([\s\S]*),\s*sideChannel:/);
    if (match) visit(JSON.parse(match[1])); // Data only: never execute page JavaScript.
  }
  const records = [
    ...new Map(
      candidates.map((r) => [JSON.stringify([r[5], r[7], r[11]]), r]),
    ).values(),
  ];
  if (records.length !== 1) throw new Error("Google 期貨報價缺少或相互矛盾");
  const record = records[0],
    [rawPrice, rawChange, rawPct] = record[5],
    referencePrice = record[7],
    seconds = record[11]?.[0];
  if (
    ![rawPrice, rawChange, rawPct, referencePrice, seconds].every(
      Number.isFinite,
    ) ||
    rawPrice <= 0 ||
    referencePrice <= 0 ||
    Math.abs(rawPrice - referencePrice - rawChange) > 0.02 ||
    Math.abs((rawChange / referencePrice) * 100 - rawPct) > 0.03
  )
    throw new Error("Google 價格、比較基準或漲跌不一致");
  const price = Math.round(rawPrice * 100) / 100;
  const visible = $(".zhtAvb .N6SYTe").first().text().trim();
  if (
    !/^\$[\d,]+\.\d{2}$/.test(visible) ||
    Math.abs(Number(visible.replace(/[$,]/g, "")) - price) > 0.005
  )
    throw new Error("Google 主報價畫面與資料不一致");
  const quotedAt = new Date(seconds * 1000).toISOString();
  if (seconds <= 0 || Date.parse(quotedAt) > Date.parse(ctx.retrievedAt))
    throw new Error("Google 報價時間無效或來自未來");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(quotedAt));
  if (date < start || date > end) return [];
  return [
    observation(id, date, price, ctx, {
      source: { name: `Google Finance · ${symbol}:NYMEX`, url: canonical.href },
      market: "US-FUTURES",
      timezone: "America/New_York",
      method: "market-data-api",
      sessionStatus: "snapshot",
      quote: {
        symbol: `${symbol}:NYMEX`,
        quotedAt,
        referencePrice: Math.round(referencePrice * 100) / 100,
        change: Math.round(rawChange * 100) / 100,
        changePct: Math.round(rawPct * 100) / 100,
      },
      evidence:
        "Google Finance 主報價與嵌入資料核對；最新／延遲期貨報價快照，非現貨、非官方結算；1D 依來源比較基準，不代表前一筆保存快照",
    }),
  ];
}
export async function googleFutures(start, end, id) {
  const ctx = await fetchArchived(
    `https://www.google.com/finance/quote/${GOOGLE_FUTURES[id]}:NYMEX`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
  );
  return parseGoogleFutures(ctx.body, id, ctx, start, end);
}
