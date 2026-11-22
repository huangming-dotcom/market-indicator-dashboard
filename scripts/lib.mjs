import {
  readFile,
  writeFile,
  mkdir,
  rename,
  open,
  unlink,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateDataset, dateSchema } from "../src/schema.mjs";
import { CATALOG } from "../src/catalog.mjs";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const dataPath = path.join(root, "public/data/history.json");
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export async function loadData(file = dataPath) {
  try {
    return validateDataset(JSON.parse(await readFile(file, "utf8")));
  } catch (e) {
    if (e.code === "ENOENT")
      return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        observations: [],
        events: [],
        runs: [],
      };
    throw e;
  }
}
export async function atomicJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = file + "." + process.pid + ".tmp";
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
  await rename(tmp, file);
}
export async function withLock(fn, lock = path.join(root, ".update.lock")) {
  let handle;
  try {
    handle = await open(lock, "wx");
  } catch (e) {
    if (e.code === "EEXIST")
      throw new Error(
        "更新已在執行；若前次中斷，確認無執行中程序後移除 .update.lock",
      );
    throw e;
  }
  try {
    return await fn();
  } finally {
    await handle.close();
    await unlink(lock);
  }
}
export function mergeObservations(existing, incoming) {
  const result = [...existing];
  for (const o of incoming) {
    const same = result
      .filter(
        (p) =>
          p.metricId === o.metricId &&
          p.date === o.date &&
          p.meetingDate === o.meetingDate,
      )
      .sort((a, b) => a.vintage.localeCompare(b.vintage))
      .at(-1);
    // Secondary FRED backfill must not supersede a completed primary close.
    if (
      same?.method === "market-data-api" &&
      new URL(o.source.url).hostname === "fred.stlouisfed.org"
    )
      continue;
    const canonical = (value) => {
      const url = new URL(value);
      for (const key of ["cosd", "coed", "period1", "period2", "range"])
        url.searchParams.delete(key);
      url.searchParams.sort();
      return url.href;
    };
    if (
      same &&
      same.value === o.value &&
      same.status === o.status &&
      canonical(same.source.url) === canonical(o.source.url) &&
      same.period === o.period &&
      same.publishedAt === o.publishedAt &&
      JSON.stringify(same.quote) === JSON.stringify(o.quote)
    )
      continue;
    result.push(o);
  }
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.metricId.localeCompare(b.metricId) ||
      a.vintage.localeCompare(b.vintage),
  );
}
export function numeric(v) {
  if (
    v === null ||
    v === undefined ||
    String(v).trim() === "" ||
    String(v).trim() === "." ||
    String(v).trim() === "--"
  )
    return null;
  const n = Number(String(v).replaceAll(",", ""));
  if (!Number.isFinite(n)) throw new Error("無效數字: " + v);
  return n;
}
export function rocDate(v) {
  const d = String(v).replaceAll("/", "");
  if (!/^\d{7,8}$/.test(d)) throw new Error("日期格式不符: " + v);
  const year =
    d.length === 7 ? Number(d.slice(0, 3)) + 1911 : Number(d.slice(0, 4));
  return dateSchema.parse(`${year}-${d.slice(-4, -2)}-${d.slice(-2)}`);
}
export function observation(id, date, value, ctx, extra = {}) {
  return {
    metricId: id,
    date,
    value,
    status: value === null ? "missing" : "verified",
    source: { name: CATALOG[id].source.name, url: ctx.url },
    retrievedAt: ctx.retrievedAt,
    publishedAt: null,
    unit: CATALOG[id].unit,
    market: [
      "us2y",
      "us10y",
      "us30y",
      "sp500",
      "nasdaq",
      "wti",
      "brent",
      "usdtwd",
    ].includes(id)
      ? "US"
      : "TW",
    timezone: [
      "us2y",
      "us10y",
      "us30y",
      "sp500",
      "nasdaq",
      "wti",
      "brent",
      "usdtwd",
    ].includes(id)
      ? "America/New_York"
      : "Asia/Taipei",
    vintage: ctx.retrievedAt,
    method: "official-api",
    rawHash: ctx.rawHash,
    ...(value === null ? { reason: "來源未發布數值；不補值" } : {}),
    ...extra,
  };
}
export async function fetchArchived(
  url,
  { signal, archive = true, headers = {} } = {},
) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        signal: signal ?? AbortSignal.timeout(20000),
        headers: {
          Accept: "application/json,text/csv,application/xml,text/xml",
          "User-Agent": "MarketIndicatorDashboard/1.0",
          ...headers,
        },
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const body = await r.text();
      const retrievedAt = new Date().toISOString();
      const rawHash = createHash("sha256").update(body).digest("hex");
      if (archive) {
        const dir = path.join(root, "data/raw", retrievedAt.slice(0, 10));
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, rawHash + ".txt"), body);
        await atomicJson(path.join(dir, rawHash + ".meta.json"), {
          url,
          retrievedAt,
          rawHash,
        });
      }
      return { body, url, retrievedAt, rawHash };
    } catch (e) {
      error = e;
      if (signal?.aborted) break;
      if (attempt < 2)
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw error;
}
