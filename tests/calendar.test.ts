// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { parseCalendar, updateCalendar } from "../scripts/calendar-update.mjs";
import {
  calendarDate,
  calendarEvents,
  calendarStale,
  validateCalendar,
} from "../src/calendar.mjs";
const cal = (events: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-WR-CALNAME:財經 M 平方 - 全球財經日曆\r\n${events}\r\nEND:VCALENDAR`;
const event = (fields: string) => `BEGIN:VEVENT\r\n${fields}\r\nEND:VEVENT`;
const range = { start: "2026-10-01", end: "2026-12-01" };
const fixture = cal(
  event(
    "UID:us-cpi\r\nDTSTART:20261125T190000Z\r\nDTEND:20261125T193000Z\r\nSUMMARY:美國-CPI\\, 年增率\r\nDESCRIPTION:市場預期: 3.2%\\nMM圖表連結: https://www.macromicro.me/\r\n collections/cpi\r\nLAST-MODIFIED:20261122T120000Z",
  ) +
    "\r\n" +
    event(
      "UID:holiday\r\nDTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20261127\r\nSUMMARY:台灣-全天事件",
    ),
);
describe("M 平方公開日曆", () => {
  it("全天日期在不同執行主機時區仍一致", () => {
    const url = new URL("../scripts/calendar-update.mjs", import.meta.url).href;
    const code = `import {parseCalendar} from ${JSON.stringify(url)}; const r=await parseCalendar(${JSON.stringify(fixture)},${JSON.stringify(range)}); console.log(JSON.stringify(r.events.filter(e=>e.allDay).map(e=>({date:e.date,endDate:e.endDate}))));`;
    for (const tz of ["UTC", "Asia/Taipei", "America/Los_Angeles"]) {
      const result = JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", code], {
          encoding: "utf8",
          env: { ...process.env, TZ: tz },
        }),
      );
      expect(result).toEqual([{ date: "2026-11-25", endDate: "2026-11-27" }]);
    }
  });
  it("正確處理 UTC 跨台灣日、全天排他結束日、折行與跳脫字元", async () => {
    const { events } = await parseCalendar(fixture, range);
    const timed = events.find((e) => e.uid === "us-cpi")!,
      allDay = events.find((e) => e.uid === "holiday")!;
    expect(timed.date).toBe("2026-11-26");
    expect(timed.startAt).toBe("2026-11-25T19:00:00.000Z");
    expect(timed.title).toBe("美國-CPI, 年增率");
    expect(timed.description).toContain("\nMM圖表連結");
    expect(timed.chartUrl).toBe("https://www.macromicro.me/collections/cpi");
    expect(allDay.startAt).toBeNull();
    expect(allDay.endDate).toBe("2026-11-27");
    expect(calendarEvents({ events }, "2026-11-26", 1)).toHaveLength(2);
    expect(calendarEvents({ events }, "2026-11-27", 1)).toHaveLength(0);
  });
  it("依原始時區處理夏令時間、重複事件與取消例外／改期", async () => {
    const base =
      "UID:weekly\r\nDTSTART;TZID=America/New_York:20261025T083000\r\nDTEND;TZID=America/New_York:20261025T090000\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nSUMMARY:美國-例行發布";
    const normal = await parseCalendar(cal(event(base)), range);
    expect(normal.events.map((e) => e.startAt)).toEqual([
      "2026-10-25T12:30:00.000Z",
      "2026-11-01T13:30:00.000Z",
      "2026-11-08T13:30:00.000Z",
    ]);
    const changed = await parseCalendar(
      cal(
        event(base + "\r\nEXDATE;TZID=America/New_York:20261101T083000") +
          "\r\n" +
          event(
            "UID:weekly\r\nRECURRENCE-ID;TZID=America/New_York:20261108T083000\r\nDTSTART;TZID=America/New_York:20261108T110000\r\nDTEND;TZID=America/New_York:20261108T113000\r\nSUMMARY:美國-已改期",
          ),
      ),
      range,
    );
    expect(changed.events).toHaveLength(2);
    expect(changed.events[1].startAt).toBe("2026-11-08T16:00:00.000Z");
    expect(changed.events[1].date).toBe("2026-11-09");
  });
  it("拒絕 HTML、截斷內容與無時區時刻，來源連結僅允許 M 平方 HTTPS", async () => {
    await expect(
      parseCalendar(
        fixture.replace("財經 M 平方 - 全球財經日曆", "其他日曆"),
        range,
      ),
    ).rejects.toThrow("日曆名稱不符");
    await expect(parseCalendar("<html>login</html>", range)).rejects.toThrow(
      "完整",
    );
    await expect(
      parseCalendar(fixture.replace("END:VEVENT", ""), range),
    ).rejects.toThrow("完整");
    await expect(
      parseCalendar(
        cal(event("UID:a\r\nDTSTART:20261125T190000\r\nSUMMARY:test")),
        range,
      ),
    ).rejects.toThrow("未標註時區");
    const result = await parseCalendar(
      fixture.replace("https://www.macromicro.me/", "https://evil.example/"),
      range,
    );
    expect(result.events.find((e) => e.uid === "us-cpi")!.chartUrl).toBeNull();
  });
  it("冪等、失敗保留成功快照，成功後反映改期／來源移除而不留下舊事件", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mm-calendar-")),
      output = path.join(dir, "calendar.json");
    const fetcher = async () => ({ body: fixture, rawHash: "a".repeat(64) });
    try {
      const first = await updateCalendar({
        output,
        fetcher,
        now: "2026-11-23T01:00:00Z",
      });
      const text = await readFile(output, "utf8");
      await updateCalendar({ output, fetcher, now: "2026-11-23T01:00:00Z" });
      expect(await readFile(output, "utf8")).toBe(text);
      const failed = await updateCalendar({
        output,
        now: "2026-11-23T02:00:00Z",
        fetcher: async () => {
          throw new Error("HTTP 503");
        },
      });
      expect(failed.status).toBe("failed");
      expect(failed.events).toEqual(first.events);
      expect(failed.lastSuccessAt).toBe(first.lastSuccessAt);
      const changed = await updateCalendar({
        output,
        now: "2026-11-23T03:00:00Z",
        fetcher: async () => ({
          rawHash: "b".repeat(64),
          body: cal(
            event(
              "UID:us-cpi\r\nDTSTART:20261126T190000Z\r\nSUMMARY:美國-CPI改期\r\nSTATUS:CANCELLED",
            ),
          ),
        }),
      });
      expect(changed.status).toBe("success");
      expect(changed.events).toHaveLength(1);
      expect(changed.events[0].date).toBe("2026-11-27");
      expect(changed.events[0].status).toBe("CANCELLED");
      expect(calendarStale(first, Date.parse("2026-11-25T00:00:00Z"))).toBe(
        true,
      );
      expect(() =>
        validateCalendar({
          ...first,
          events: [...first.events, first.events[0]],
        }),
      ).toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
