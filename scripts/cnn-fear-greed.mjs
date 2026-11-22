import { fetchArchived, observation } from "./lib.mjs";
import { CNN_RATING_KEYS } from "../src/sentiment.mjs";
export const CNN_URL =
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
const score = (value) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  )
    throw new Error("CNN 分數須為 0–100");
  return value;
};
const rating = (value) => {
  if (
    typeof value !== "string" ||
    !CNN_RATING_KEYS.includes(value.trim().toLowerCase())
  )
    throw new Error("CNN 情緒分類未知");
  return value.trim().toLowerCase();
};
const nyDate = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export function parseCnnFearGreed(body, ctx, start, end) {
  const j = JSON.parse(body),
    current = j.fear_and_greed,
    historical = j.fear_and_greed_historical;
  if (!current || !Array.isArray(historical?.data))
    throw new Error("CNN 資料格式缺少主指數或歷史序列");
  const value = score(current.score),
    currentRating = rating(current.rating);
  const time = Date.parse(current.timestamp);
  if (!Number.isFinite(time) || time > Date.parse(ctx.retrievedAt))
    throw new Error("CNN 更新時間無效或來自未來");
  const updatedAt = new Date(time).toISOString(),
    currentDate = nyDate(time),
    byDate = new Map();
  const make = (date, value, sentiment) =>
    observation("fearGreed", date, value, ctx, {
      source: { name: "CNN Fear & Greed Index", url: CNN_URL },
      market: "US",
      timezone: "America/New_York",
      method: "official-api",
      sessionStatus: "snapshot",
      ...(sentiment ? { sentiment } : {}),
      evidence:
        "CNN 官方 graphdata。歷史午夜 UTC x 為來源日期標記；非午夜時間按紐約觀測日。情緒分類使用來源 rating，前收基準僅採 current.previous_close，不指定未提供的基準日期。",
    });
  for (const row of historical.data) {
    if (
      !Number.isFinite(row.x) ||
      row.x < 0 ||
      row.x > Date.parse(ctx.retrievedAt)
    )
      throw new Error("CNN 歷史日期無效或來自未來");
    const date =
      row.x % 86400000 === 0
        ? new Date(row.x).toISOString().slice(0, 10)
        : nyDate(row.x);
    if (date < start || date > end || date > currentDate) continue;
    const item = make(
      date,
      row.y === null ? null : score(row.y),
      row.y === null ? null : { rating: rating(row.rating) },
    );
    const previous = byDate.get(date);
    if (!previous || row.x > previous.stamp)
      byDate.set(date, { stamp: row.x, item });
  }
  if (currentDate >= start && currentDate <= end) {
    const sentiment = { rating: currentRating, updatedAt };
    if (current.previous_close !== undefined && current.previous_close !== null)
      sentiment.previousClose = score(current.previous_close);
    byDate.set(currentDate, {
      stamp: time,
      item: make(currentDate, value, sentiment),
    });
  }
  return [...byDate.values()]
    .map((row) => row.item)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export async function cnnFearGreed(start, end) {
  const ctx = await fetchArchived(CNN_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: "https://www.cnn.com/",
      Origin: "https://www.cnn.com",
    },
  });
  return parseCnnFearGreed(ctx.body, ctx, start, end);
}
