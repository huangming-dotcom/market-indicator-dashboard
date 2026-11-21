import { XMLParser } from "fast-xml-parser";
import { load } from "cheerio";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchArchived, observation, root } from "./lib.mjs";

export function parseFedRss(body, ctx, end) {
  const rss = new XMLParser().parse(body);
  const raw = rss.rss?.channel?.item;
  if (!raw) throw new Error("Fed RSS 格式變動");
  return (Array.isArray(raw) ? raw : [raw])
    .filter((item) =>
      /Federal Open Market Committee|FOMC statement/.test(item.title),
    )
    .flatMap((item) => {
      const publishedAt = new Date(item.pubDate).toISOString();
      const date = publishedAt.slice(0, 10);
      if (date > end) return [];
      const url = new URL(item.link);
      if (url.hostname !== "www.federalreserve.gov")
        throw new Error("Fed RSS 來源網域不符");
      return [
        {
          id: url.href,
          kind: "fomc",
          date,
          title: /^Minutes/.test(item.title)
            ? "FOMC 會議紀錄發布"
            : /statement/.test(item.title)
              ? "FOMC 政策聲明"
              : "FOMC 會議資訊",
          summary: String(item.title),
          source: { name: "美國聯準會 · 官方公告", url: url.href },
          publishedAt,
          retrievedAt: ctx.retrievedAt,
          confidence: "official",
        },
      ];
    })
    .slice(0, 12);
}
export async function fedPolicy(end) {
  const ctx = await fetchArchived(
    "https://www.federalreserve.gov/feeds/press_monetary.xml",
  );
  return parseFedRss(ctx.body, ctx, end);
}
// Stable, explicit integration boundary for an authenticated CME export or a
// reviewed official snapshot. The producer must supply all scenarios together.
export function parseFedwatchSnapshot(body, ctx, end) {
  const payload = JSON.parse(body);
  const sourceUrl = new URL(
    payload.sourceUrl ??
      "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool",
  );
  if (
    sourceUrl.protocol !== "https:" ||
    !(
      sourceUrl.hostname === "cmegroup.com" ||
      sourceUrl.hostname.endsWith(".cmegroup.com")
    )
  )
    throw new Error("CME 快照需提供官方 HTTPS 來源");
  const { date, meetingDate, observedAt, currentTargetUpperBp, scenarios } =
    payload;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date > end ||
    meetingDate <= date ||
    !Number.isFinite(currentTargetUpperBp) ||
    !Array.isArray(scenarios) ||
    !scenarios.length
  )
    throw new Error("CME 快照缺少日期、目前利率區間或完整情境");
  if (
    !observedAt ||
    !Number.isFinite(Date.parse(observedAt)) ||
    Date.parse(observedAt) > Date.parse(ctx.retrievedAt)
  )
    throw new Error("CME 快照時間無效");
  const sums = { fedCut: 0, fedHold: 0, fedHike: 0 };
  const ranges = new Set();
  for (const s of scenarios) {
    if (
      !Number.isFinite(s.targetUpperBp) ||
      !Number.isFinite(s.probabilityPct) ||
      s.probabilityPct < 0 ||
      s.probabilityPct > 100 ||
      ranges.has(s.targetUpperBp)
    )
      throw new Error("CME 情境值無效或重複");
    ranges.add(s.targetUpperBp);
    sums[
      s.targetUpperBp < currentTargetUpperBp
        ? "fedCut"
        : s.targetUpperBp > currentTargetUpperBp
          ? "fedHike"
          : "fedHold"
    ] += s.probabilityPct;
  }
  if (Math.abs(Object.values(sums).reduce((a, b) => a + b, 0) - 100) > 0.1)
    throw new Error("CME 完整情境機率合計必須為 100%");
  return Object.entries(sums).map(([id, value]) =>
    observation(id, date, value, ctx, {
      meetingDate,
      publishedAt: observedAt,
      sessionStatus: "snapshot",
      market: "US",
      timezone: "America/Chicago",
      source: {
        name: "CME FedWatch · 完整快照",
        url: sourceUrl.href,
      },
      evidence: "同會議、同觀測時間，依目標利率區間分類完整情境",
    }),
  );
}
export async function fedwatch(end) {
  if (process.env.CME_FEDWATCH_SNAPSHOT_FILE) {
    const file = path.resolve(root, process.env.CME_FEDWATCH_SNAPSHOT_FILE);
    const body = await readFile(file, "utf8");
    return parseFedwatchSnapshot(
      body,
      {
        url: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool",
        retrievedAt: new Date().toISOString(),
      },
      end,
    );
  }
  // Use only an explicitly configured official endpoint. Never guess an API
  // URL, put API credentials in the frontend, or turn news wording into numbers.
  const endpoint = process.env.CME_FEDWATCH_URL;
  if (!endpoint)
    throw new Error(
      "精確機率尚未串接：需官方完整快照。政策報導與 FOMC 公告已另列，不補估百分比。",
    );
  const hostname = new URL(endpoint).hostname;
  if (
    !endpoint.startsWith("https://") ||
    (!hostname.endsWith(".cmegroup.com") && hostname !== "cmegroup.com")
  )
    throw new Error("CME endpoint 必須為官方 HTTPS 網域");
  const ctx = await fetchArchived(endpoint, {
    headers: process.env.CME_API_TOKEN
      ? { Authorization: "Bearer " + process.env.CME_API_TOKEN }
      : {},
  });
  return parseFedwatchSnapshot(ctx.body, ctx, end);
}
export async function reviewedPolicy(end) {
  try {
    const url = process.env.DAILY_RADAR_POLICY_URL;
    if (url && !url.startsWith("https://"))
      throw new Error("每日雷達 feed 需 HTTPS");
    const body = url
      ? (await fetchArchived(url)).body
      : await readFile(path.join(root, "data/policy-reviewed.json"), "utf8");
    const input = JSON.parse(body),
      rows = Array.isArray(input) ? input : input.policy;
    if (!Array.isArray(rows)) throw new Error("每日雷達需提供 policy 陣列");
    return rows.filter((p) => p.date <= end);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
export async function reportedFedwatch(reference, end) {
  const ctx = await fetchArchived(reference.url);
  const text = load(ctx.body)("body").text().replace(/\s+/g, " ");
  if (
    !/Reuters/i.test(text) ||
    !/CME|FedWatch/i.test(text) ||
    !text.toLowerCase().includes(reference.checkPhrase.toLowerCase())
  )
    throw new Error("政策補充報導原文核對失敗");
  return [
    {
      id: reference.url,
      kind: "fedwatch-commentary",
      date: reference.date,
      title: "FedWatch 政策預期 · Reuters 報導",
      summary: reference.summary,
      source: { name: "Reuters／MarketScreener 轉載", url: reference.url },
      publishedAt: reference.publishedAt ?? null,
      retrievedAt: ctx.retrievedAt,
      confidence: "reported",
      meetingDate: reference.meetingDate,
      approximate: true,
    },
  ].filter((row) => row.date <= end);
}
