import { XMLParser } from "fast-xml-parser";
import { parse } from "csv-parse/sync";
import { fetchArchived, observation, numeric, rocDate } from "./lib.mjs";
export function parseTreasury(body, ctx, start, end) {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(body);
  const entries = parsed.feed?.entry;
  if (!entries) throw new Error("Treasury XML 缺少 entry");
  const output = [];
  for (const e of Array.isArray(entries) ? entries : [entries]) {
    const p = e.content?.["m:properties"];
    const date = String(
      p?.["d:NEW_DATE"]?.["#text"] ?? p?.["d:NEW_DATE"] ?? "",
    ).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error("Treasury 日期格式變動");
    if (date < start || date > end) continue;
    for (const [id, k] of [
      ["us2y", "d:BC_2YEAR"],
      ["us10y", "d:BC_10YEAR"],
      ["us30y", "d:BC_30YEAR"],
    ]) {
      const v = p[k];
      output.push(
        observation(
          id,
          date,
          numeric(typeof v === "object" ? v["#text"] : v),
          ctx,
        ),
      );
    }
  }
  return output;
}
export async function treasury(start, end) {
  const result = [];
  for (
    let year = Number(start.slice(0, 4));
    year <= Number(end.slice(0, 4));
    year++
  ) {
    const ctx = await fetchArchived(
      `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`,
    );
    result.push(...parseTreasury(ctx.body, ctx, start, end));
  }
  return result;
}
export function parseFred(body, id, series, ctx, start, end) {
  const records = parse(body, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
  if (
    !records.length ||
    !("observation_date" in records[0]) ||
    !(series in records[0])
  )
    throw new Error("FRED CSV 標頭變動／非 CSV");
  // FRED blank rows represent non-publishing days (including holidays). Do not invent sessions.
  return records
    .filter(
      (r) =>
        r.observation_date >= start &&
        r.observation_date <= end &&
        numeric(r[series]) !== null,
    )
    .map((r) => observation(id, r.observation_date, numeric(r[series]), ctx));
}
export async function fred(start, end, id, series) {
  const ctx = await fetchArchived(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}&cosd=${start}&coed=${end}`,
  );
  return parseFred(ctx.body, id, series, ctx, start, end);
}
export function parseTwseMonth(j, ctx, start, end) {
  if (
    j.stat !== "OK" ||
    !j.fields?.includes("成交股數") ||
    !j.fields?.includes("發行量加權股價指數")
  )
    throw new Error("TWSE 月資料格式變動／未發布");
  const result = [];
  for (const row of j.data) {
    const date = rocDate(row[0]);
    if (date < start || date > end) continue;
    for (const [id, field, div] of [
      ["taiex", "發行量加權股價指數", 1],
      ["volume", "成交股數", 1e8],
      ["turnover", "成交金額", 1e8],
    ]) {
      const n = numeric(row[j.fields.indexOf(field)]);
      result.push(observation(id, date, n === null ? null : n / div, ctx));
    }
  }
  return result;
}
export async function twseMonth(start, end) {
  const result = [];
  let cursor = start.slice(0, 7) + "-01";
  while (cursor <= end) {
    const ctx = await fetchArchived(
      `https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?date=${cursor.replaceAll("-", "")}&response=json`,
    );
    result.push(...parseTwseMonth(JSON.parse(ctx.body), ctx, start, end));
    const d = new Date(cursor + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return result;
}
function dailyJson(body, date) {
  const j = JSON.parse(body);
  if (j.stat !== "OK" || j.date !== date.replaceAll("-", ""))
    throw new Error("TWSE 未發布指定日期或回傳其他日期");
  return j;
}
export function parseFlow(body, ctx, date) {
  const j = dailyJson(body, date);
  if (j.fields?.[3] !== "買賣差額") throw new Error("法人欄位變動");
  const lookup = (name) => {
    const r = j.data.find((r) => r[0] === name);
    if (!r) throw new Error("缺少法人列 " + name);
    return numeric(r[3]);
  };
  const dealer1 = lookup("自營商(自行買賣)"),
    dealer2 = lookup("自營商(避險)");
  return [
    ["foreign", lookup("外資及陸資(不含外資自營商)")],
    ["trust", lookup("投信")],
    ["dealer", dealer1 === null || dealer2 === null ? null : dealer1 + dealer2],
  ].map(([id, n]) => observation(id, date, n === null ? null : n / 1e8, ctx));
}
export function parseStructure(body, ctx, date) {
  const j = dailyJson(body, date);
  const table = j.tables?.find((t) => t.title === "漲跌證券數合計");
  const column = table?.fields?.indexOf("股票");
  if (column === undefined || column < 0) throw new Error("廣度股票欄位變動");
  return [
    ["advancers", "上漲(漲停)"],
    ["decliners", "下跌(跌停)"],
  ].map(([id, label]) => {
    const row = table.data.find((r) => r[0] === label);
    if (!row) throw new Error("廣度列缺漏");
    const v = numeric(String(row[column]).split("(")[0]);
    return observation(id, date, v, ctx);
  });
}
export function parseMargin(body, ctx, date) {
  const j = dailyJson(body, date);
  const t = j.tables?.find((t) => t.fields?.includes("今日餘額"));
  const row = t?.data?.find((r) => r[0] === "融資金額(仟元)");
  if (!row) throw new Error("融資金額欄位變動");
  const n = numeric(row[t.fields.indexOf("今日餘額")]);
  return [
    observation("marginTw", date, n === null ? null : n / 1e5, ctx, {
      reason: "今日餘額可能更帳，依 TWSE 說明以前日餘額最終值為準",
    }),
  ];
}
export async function twseDaily(dates, kind) {
  const result = [];
  for (const date of dates) {
    const route =
      kind === "flow"
        ? `fund/BFI82U?dayDate=${date.replaceAll("-", "")}&type=day`
        : kind === "breadth"
          ? `afterTrading/MI_INDEX?date=${date.replaceAll("-", "")}&type=MS`
          : `marginTrading/MI_MARGN?date=${date.replaceAll("-", "")}&selectType=MS`;
    const ctx = await fetchArchived(
      "https://www.twse.com.tw/rwd/zh/" + route + "&response=json",
    );
    result.push(
      ...(kind === "flow"
        ? parseFlow
        : kind === "breadth"
          ? parseStructure
          : parseMargin)(ctx.body, ctx, date),
    );
  }
  return result;
}
export async function tpex(start, end) {
  const ctx = await fetchArchived(
    "https://www.tpex.org.tw/openapi/v1/tpex_index",
  );
  const j = JSON.parse(ctx.body);
  if (!Array.isArray(j) || !j.length || !("Close" in j[0]))
    throw new Error("TPEX 格式變動");
  return j
    .filter((r) => rocDate(r.Date) >= start && rocDate(r.Date) <= end)
    .map((r) => observation("tpex", rocDate(r.Date), numeric(r.Close), ctx));
}
