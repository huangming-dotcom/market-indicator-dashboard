import { z } from "zod";

export const RADAR_THREAD = "6ade98e2-3904-83ee-ae10-fec63d905096";
export const RADAR_URL = `https://chatgpt.com/c/${RADAR_THREAD}`;
export const REPORT_FORMAT_VERSION = 2;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
  );
const key = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
  .max(60);
const chartSchema = z
  .object({
    chartType: z.enum(["line", "bar"]),
    meta: z.object({
      title: z.string().max(200),
      description: z.string().max(500).optional(),
    }),
    yAxisMin: z.number().finite().optional(),
    yAxisMax: z.number().finite().optional(),
    xKey: key,
    series: z
      .array(
        z.object({
          dataKey: key,
          label: z.string().max(100),
          valuePrefix: z.string().max(20).optional(),
          valueSuffix: z.string().max(20).optional(),
        }),
      )
      .min(1)
      .max(8),
    data: z
      .array(
        z.record(
          z.string(),
          z.union([z.string().max(100), z.number().finite(), z.null()]),
        ),
      )
      .min(1)
      .max(366),
  })
  .superRefine((c, ctx) => {
    if (
      c.yAxisMin !== undefined &&
      c.yAxisMax !== undefined &&
      c.yAxisMin >= c.yAxisMax
    )
      ctx.addIssue({ code: "custom", message: "圖表座標上下界無效" });
    for (const row of c.data) {
      if (
        !(c.xKey in row) ||
        c.series.some(
          (s) =>
            !(s.dataKey in row) ||
            (row[s.dataKey] !== null && typeof row[s.dataKey] !== "number"),
        )
      )
        ctx.addIssue({ code: "custom", message: "圖表欄位／數值無效" });
    }
  });

// Normalize presentation only. The archive's originalText and its hash are never
// rewritten, and no values, forecasts, classifications or missing cells are inferred.
export function normalizeReportChart(value, context = "") {
  if (!value || typeof value !== "object") throw new Error("缺少圖表內容");
  const sourceMeta = value.meta;
  if (
    sourceMeta !== undefined &&
    (!sourceMeta || typeof sourceMeta !== "object" || Array.isArray(sourceMeta))
  )
    throw new Error("圖表 metadata 格式錯誤");
  // H1 in radar reports is reserved for the report title and large KPI numbers.
  const heading = [...context.matchAll(/^#{2,6}\s+(.+)$/gm)]
    .map((m) => m[1].replace(/[*_`]/g, "").trim())
    .filter(
      (s) => /[A-Za-z\u3400-\u9fff]/.test(s) && !/^US\\?\$[\d,.]+$/.test(s),
    )
    .at(-1);
  const fallback = heading?.slice(0, 200) || "市場指標圖表";
  return chartSchema.parse({
    ...value,
    meta: { ...sourceMeta, title: sourceMeta?.title ?? fallback },
  });
}

// Source markup is data only: never interpret executable HTML or chart code.
export function reportBlocks(text) {
  const blocks = [];
  const pattern = /genui([\s\S]*?)/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset)
      blocks.push({
        kind: "markdown",
        text: cleanText(text.slice(offset, match.index)),
      });
    const widget = JSON.parse(match[1]);
    const chart = normalizeReportChart(
      widget.charts_widget_v2?.content,
      text.slice(0, match.index),
    );
    blocks.push({ kind: "chart", chart });
    offset = match.index + match[0].length;
  }
  if (offset < text.length)
    blocks.push({ kind: "markdown", text: cleanText(text.slice(offset)) });
  return blocks;
}
function cleanText(text) {
  return text
    .replace(/cite[^]*/g, `[引用見原文](${RADAR_URL})`)
    .replace(/url([^]+)(https:\/\/[^]+)/g, "[$1]($2)")
    .replace(/&amp;/g, "&");
}
const reportSchema = z
  .object({
    date,
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    importedAt: z.iso.datetime(),
    title: z.string().min(1).max(200),
    formatVersion: z
      .union([z.literal(1), z.literal(REPORT_FORMAT_VERSION)])
      .optional(),
    messageIds: z.array(z.string().min(1).max(100)).min(1).max(100),
    originalText: z.string().min(100).max(100000),
  })
  .superRefine((r, ctx) => {
    try {
      reportBlocks(r.originalText);
    } catch {
      ctx.addIssue({ code: "custom", message: "摘要圖表格式無效" });
    }
  });
export const reportArchiveSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.object({
      threadId: z.literal(RADAR_THREAD),
      title: z.literal("市場指標雷達"),
    }),
    reports: z.array(reportSchema).max(10000),
  })
  .superRefine((archive, ctx) => {
    const seen = new Set();
    for (const r of archive.reports) {
      const id = `${r.date}:${r.revision}`;
      if (seen.has(id))
        ctx.addIssue({ code: "custom", message: "摘要版本重複" });
      seen.add(id);
      if (
        r.date >
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(
          new Date(r.importedAt),
        )
      )
        ctx.addIssue({ code: "custom", message: "不可匯入未來摘要" });
    }
  });
export const validateReports = (value) => reportArchiveSchema.parse(value);
export function latestReports(archive) {
  const byDate = new Map();
  for (const r of archive.reports) {
    if (!byDate.has(r.date) || byDate.get(r.date).importedAt <= r.importedAt)
      byDate.set(r.date, r);
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}
