import { z } from "zod";
export const CALENDAR_ID =
  "c_597b99efc6b2429fff1bf02863b61b7b08a176d17fb6ad0b1d6ba1f3fa3ac9c9@group.calendar.google.com";
export const CALENDAR_URL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR_ID)}&ctz=Asia%2FTaipei`;
export const CALENDAR_ICS = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
export const calendarDate = (value = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const addDays = (date, days) =>
  new Date(Date.parse(date + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
  );
const timestamp = z.iso.datetime();
export const calendarEventSchema = z
  .object({
    id: z.string().min(1).max(600),
    uid: z.string().min(1).max(400),
    title: z.string().min(1).max(1000),
    description: z.string().max(20000),
    date,
    allDay: z.boolean(),
    startAt: timestamp.nullable(),
    endAt: timestamp.nullable(),
    endDate: date.nullable(),
    sourceTimezone: z.string().min(1).max(200),
    status: z.enum(["CONFIRMED", "TENTATIVE", "CANCELLED"]),
    updatedAt: timestamp.nullable(),
    chartUrl: z
      .string()
      .url()
      .nullable()
      .refine(
        (s) =>
          s === null ||
          (new URL(s).protocol === "https:" &&
            ["macromicro.me", "www.macromicro.me"].includes(
              new URL(s).hostname,
            )),
      ),
  })
  .superRefine((e, ctx) => {
    if (
      e.allDay
        ? e.startAt !== null ||
          e.endAt !== null ||
          (e.endDate !== null && e.endDate <= e.date)
        : !e.startAt ||
          calendarDate(e.startAt) !== e.date ||
          e.endDate !== null ||
          (e.endAt && e.endAt < e.startAt)
    )
      ctx.addIssue({
        code: "custom",
        message: "事件日期／時區或結束時間不一致",
      });
  });
export const calendarSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.object({
      id: z.literal(CALENDAR_ID),
      name: z.literal("財經 M 平方 - 全球財經日曆"),
      url: z.literal(CALENDAR_URL),
      feedUrl: z.literal(CALENDAR_ICS),
    }),
    lastAttemptAt: timestamp,
    lastSuccessAt: timestamp.nullable(),
    status: z.enum(["success", "failed"]),
    message: z.string().max(500).nullable(),
    rawHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    coverage: z.object({ start: date, end: date }),
    sourceEventCount: z.number().int().nonnegative(),
    events: z.array(calendarEventSchema).max(20000),
  })
  .superRefine((d, ctx) => {
    if (
      d.coverage.start >= d.coverage.end ||
      (d.lastSuccessAt && d.lastSuccessAt > d.lastAttemptAt) ||
      (d.status === "success" && (!d.lastSuccessAt || !d.rawHash))
    )
      ctx.addIssue({ code: "custom", message: "日曆同步資訊無效" });
    const ids = new Set();
    for (const e of d.events) {
      if (
        ids.has(e.id) ||
        e.date >= d.coverage.end ||
        (e.date < d.coverage.start &&
          (!e.endDate || e.endDate <= d.coverage.start) &&
          (!e.endAt || calendarDate(e.endAt) < d.coverage.start))
      )
        ctx.addIssue({ code: "custom", message: "事件重複或超出範圍" });
      ids.add(e.id);
    }
  });
export const validateCalendar = (value) => calendarSchema.parse(value);
export function eventRegion(title) {
  return /美國|聯準會|FOMC/.test(title)
    ? "美國"
    : /台灣|臺灣/.test(title)
      ? "台灣"
      : /中國/.test(title)
        ? "中國"
        : /日本/.test(title)
          ? "日本"
          : /歐元|德國|法國|義大利/.test(title)
            ? "歐洲"
            : /英國/.test(title)
              ? "英國"
              : "其他";
}
export function calendarEvents(
  data,
  start,
  days,
  { query = "", region = "全部" } = {},
) {
  const end = addDays(start, days);
  return data.events
    .filter(
      (e) =>
        (e.date >= start ||
          (e.endDate && e.endDate > start) ||
          (e.endAt && calendarDate(e.endAt) >= start)) &&
        e.date < end &&
        (region === "全部" || eventRegion(e.title) === region) &&
        (!query ||
          `${e.title} ${e.description}`
            .toLowerCase()
            .includes(query.toLowerCase())),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startAt ?? "").localeCompare(b.startAt ?? "") ||
        a.id.localeCompare(b.id),
    );
}
export function calendarStale(data, now = Date.now()) {
  return !data.lastSuccessAt || now - Date.parse(data.lastSuccessAt) > 86400000;
}
