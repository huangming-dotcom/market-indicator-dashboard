import { z } from "zod";
import { CATALOG } from "./catalog.mjs";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "無效日期",
  );
const timestamp = z.string().datetime({ offset: true });
export const sourceSchema = z.object({
  name: z.string().min(1),
  url: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://"), "來源必須為 HTTPS"),
});
export const observationSchema = z
  .object({
    metricId: z.string().refine((v) => !!CATALOG[v], "未知指標"),
    date: dateSchema,
    value: z.number().finite().nullable(),
    status: z.enum(["verified", "missing"]),
    source: sourceSchema,
    retrievedAt: timestamp,
    publishedAt: timestamp.nullable(),
    unit: z.string(),
    market: z.string().min(1),
    timezone: z.string().min(1),
    reason: z.string().optional(),
    period: z.string().optional(),
    meetingDate: dateSchema.optional(),
    vintage: timestamp,
    method: z.enum(["official-api", "reviewed-import", "market-data-api"]),
    sessionStatus: z.enum(["close", "snapshot"]).optional(),
    evidence: z.string().optional(),
    rawHash: z.string().optional(),
  })
  .superRefine((o, ctx) => {
    const err = (message) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    if (!CATALOG[o.metricId]) return;
    if ((o.status === "missing") !== (o.value === null))
      err("缺值必須為 null；有效值必須為 verified");
    if (o.value === null && !o.reason) err("缺值必須附原因");
    if (o.unit !== CATALOG[o.metricId].unit) err("單位不符 catalog");
    if (CATALOG[o.metricId].group === "ai" && !o.period)
      err("AI 基本面必須指定財報／營收期間");
    if (o.publishedAt && Date.parse(o.publishedAt) > Date.parse(o.retrievedAt))
      err("發布時間不可晚於擷取時間");
    if (
      o.method === "reviewed-import" &&
      o.value !== null &&
      CATALOG[o.metricId].meeting &&
      o.meetingDate <= o.date
    )
      err("FedWatch 會議日期必須晚於快照日期");
    if (CATALOG[o.metricId].meeting && !o.meetingDate)
      err("FedWatch 必須指定會議日期");
    if (
      o.value !== null &&
      CATALOG[o.metricId].meeting &&
      (o.value < 0 || o.value > 100)
    )
      err("機率須為 0–100");
    if (o.method === "reviewed-import" && (!o.evidence || !o.publishedAt))
      err("人工核對匯入須附 evidence 與 publishedAt");
    if (o.date > o.retrievedAt.slice(0, 10)) err("不可有未來觀測值");
  });
export const eventSchema = z.object({
  id: z.string(),
  company: z.string(),
  period: z.string(),
  title: z.string(),
  detail: z.string(),
  publishedAt: timestamp,
  retrievedAt: timestamp,
  source: sourceSchema,
  evidence: z.string().min(1),
});
export const datasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: timestamp,
    observations: z.array(observationSchema),
    events: z.array(eventSchema),
    policy: z
      .array(
        z.object({
          id: z.string().min(1),
          kind: z.enum(["fomc", "fedwatch-commentary"]),
          date: dateSchema,
          title: z.string().min(1),
          summary: z.string().min(1),
          source: sourceSchema,
          publishedAt: timestamp.nullable(),
          retrievedAt: timestamp,
          confidence: z.enum(["official", "reported"]),
          meetingDate: dateSchema.optional(),
          referenceUrl: z.string().url().optional(),
          approximate: z.boolean().optional(),
        }),
      )
      .default([]),
    runs: z.array(
      z.object({
        id: z.string(),
        startedAt: timestamp,
        finishedAt: timestamp,
        status: z.enum(["success", "partial", "failed"]),
        providers: z.array(
          z.object({
            name: z.string(),
            status: z.enum(["success", "failed"]),
            count: z.number(),
            message: z.string().optional(),
          }),
        ),
      }),
    ),
  })
  .superRefine((d, ctx) => {
    const keys = new Set();
    for (const o of d.observations) {
      const key = [o.metricId, o.date, o.meetingDate ?? "", o.vintage].join(
        "|",
      );
      if (keys.has(key))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "重複觀測 vintage: " + key,
        });
      keys.add(key);
    }
    const fed = new Map();
    for (const o of d.observations.filter(
      (o) => CATALOG[o.metricId].meeting && o.value !== null,
    )) {
      const key = [o.date, o.meetingDate, o.vintage].join("|");
      fed.set(key, [...(fed.get(key) || []), o]);
    }
    for (const [key, rows] of fed)
      if (
        rows.length !== 3 ||
        Math.abs(rows.reduce((s, o) => s + o.value, 0) - 100) > 0.1
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "FedWatch 降息／維持／升息須完整且合計 100%: " + key,
        });
  });
export function validateDataset(d) {
  return datasetSchema.parse(d);
}
