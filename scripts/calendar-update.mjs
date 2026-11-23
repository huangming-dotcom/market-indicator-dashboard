import ical from "node-ical";
import { mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { atomicJson, fetchArchived, root, withLock } from "./lib.mjs";
import {
  CALENDAR_ID,
  CALENDAR_URL,
  CALENDAR_ICS,
  calendarDate,
  addDays,
  validateCalendar,
} from "../src/calendar.mjs";
export const calendarPath = path.join(root, "public/calendar/macromicro.json");
const text = (v) =>
  typeof v === "string" ? v : typeof v?.val === "string" ? v.val : "";
const iso = (v) =>
  v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString() : null;
// node-ical represents VALUE=DATE as local-midnight Date objects. Preserve its
// calendar components; converting these placeholders to UTC shifts the day.
const dateOnly = (d) =>
  `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export async function parseCalendar(body, { start, end }) {
  if (
    !body.trimStart().startsWith("BEGIN:VCALENDAR") ||
    !body.trimEnd().endsWith("END:VCALENDAR") ||
    body.length > 5000000 ||
    (body.match(/^BEGIN:VEVENT\r?$/gm) ?? []).length !==
      (body.match(/^END:VEVENT\r?$/gm) ?? []).length
  )
    throw new Error("來源不是完整的公開 iCalendar");
  if (/DTSTART:\d{8}T\d{6}(?:\r?\n)/.test(body))
    throw new Error("來源包含未標註時區的發布時刻，不能推測換算");
  const parsed = await ical.async.parseICS(body);
  if (
    text(parsed.vcalendar?.["WR-CALNAME"]) &&
    !/財經.*平方/.test(text(parsed.vcalendar["WR-CALNAME"]))
  )
    throw new Error("來源日曆名稱不符");
  const feedEvents = Object.values(parsed).filter((e) => e?.type === "VEVENT");
  if (!feedEvents.length) throw new Error("來源沒有事件；保留上次成功資料");
  const output = new Map();
  for (const base of feedEvents) {
    if (
      base.rrule &&
      !/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(?:;|\r|\n|$)/.test(
        base.rrule.toString(),
      )
    )
      throw new Error("不支援高頻重複事件");
    const instances = base.rrule
      ? ical.expandRecurringEvent(base, {
          from: new Date(start + "T00:00:00+08:00"),
          to: new Date(end + "T00:00:00+08:00"),
          expandOngoing: true,
          maxIterations: 10000,
        })
      : [
          {
            start: base.start,
            end: base.end,
            isFullDay: base.datetype === "date",
            event: base,
          },
        ];
    for (const instance of instances) {
      const e = instance.event,
        allDay = instance.isFullDay;
      const begin = iso(instance.start),
        finish = iso(instance.end);
      if (!begin || !text(e.summary) || !text(e.uid))
        throw new Error("事件缺少標題、日期或 UID");
      if (!allDay)
        new Intl.DateTimeFormat("en", {
          timeZone: instance.start.tz ?? "UTC",
        }).format(instance.start);
      const date = allDay ? dateOnly(instance.start) : calendarDate(begin),
        endDate = allDay && finish ? dateOnly(instance.end) : null;
      if (
        date >= end ||
        (date < start &&
          !(allDay
            ? endDate && endDate > start
            : finish && calendarDate(finish) >= start))
      )
        continue;
      const description = text(e.description);
      const candidate = description.match(
        /https:\/\/(?:www\.)?macromicro\.me\/[^\s<>"\\]+/,
      )?.[0];
      const event = {
        id: `${e.uid}:${allDay ? date : begin}`,
        uid: text(e.uid),
        title: text(e.summary),
        description,
        date,
        allDay,
        startAt: allDay ? null : begin,
        endAt: allDay ? null : finish,
        endDate,
        sourceTimezone: allDay ? "date-only" : (instance.start.tz ?? "UTC"),
        status: e.status ?? "CONFIRMED",
        updatedAt: iso(e.lastmodified),
        chartUrl: candidate ?? null,
      };
      const previous = output.get(event.id);
      if (!previous || (event.updatedAt ?? "") >= (previous.updatedAt ?? ""))
        output.set(event.id, event);
    }
  }
  return {
    events: [...output.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    ),
    sourceEventCount: feedEvents.length,
  };
}
export async function updateCalendar({
  output = calendarPath,
  fetcher = fetchArchived,
  now = new Date().toISOString(),
} = {}) {
  await mkdir(path.dirname(output), { recursive: true });
  return withLock(async () => {
    let previous;
    try {
      previous = validateCalendar(JSON.parse(await readFile(output, "utf8")));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const today = calendarDate(now),
      coverage = { start: addDays(today, -90), end: addDays(today, 366) };
    let next;
    try {
      const ctx = await fetcher(CALENDAR_ICS, {
        headers: { Accept: "text/calendar" },
      });
      const result = await parseCalendar(ctx.body, coverage);
      next = validateCalendar({
        schemaVersion: 1,
        source: {
          id: CALENDAR_ID,
          name: "財經 M 平方 - 全球財經日曆",
          url: CALENDAR_URL,
          feedUrl: CALENDAR_ICS,
        },
        lastAttemptAt: now,
        lastSuccessAt: now,
        status: "success",
        message: null,
        rawHash: ctx.rawHash,
        coverage,
        ...result,
      });
    } catch (e) {
      next = validateCalendar({
        ...previous,
        schemaVersion: 1,
        source: {
          id: CALENDAR_ID,
          name: "財經 M 平方 - 全球財經日曆",
          url: CALENDAR_URL,
          feedUrl: CALENDAR_ICS,
        },
        lastAttemptAt: now,
        lastSuccessAt: previous?.lastSuccessAt ?? null,
        status: "failed",
        message: String(e.message).slice(0, 500),
        rawHash: previous?.rawHash ?? null,
        coverage: previous?.coverage ?? coverage,
        sourceEventCount: previous?.sourceEventCount ?? 0,
        events: previous?.events ?? [],
      });
    }
    if (JSON.stringify(next) !== JSON.stringify(previous))
      await atomicJson(output, next);
    return next;
  }, output + ".lock");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  updateCalendar()
    .then((d) =>
      console.log(
        JSON.stringify({
          status: d.status,
          events: d.events.length,
          coverage: d.coverage,
          message: d.message,
        }),
      ),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
