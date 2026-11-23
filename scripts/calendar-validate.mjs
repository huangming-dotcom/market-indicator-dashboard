import { readFile } from "node:fs/promises";
import { validateCalendar } from "../src/calendar.mjs";
import { calendarPath } from "./calendar-update.mjs";
const d = validateCalendar(JSON.parse(await readFile(calendarPath, "utf8")));
console.log(
  `日曆驗證通過：${d.events.length} 個事件，狀態 ${d.status}，最後成功 ${d.lastSuccessAt ?? "尚無"}`,
);
