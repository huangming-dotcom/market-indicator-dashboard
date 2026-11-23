import { readFile } from "node:fs/promises";
import { validateReports } from "../src/reports.mjs";
import { reportPath } from "./import-reports.mjs";
const archive = validateReports(JSON.parse(await readFile(reportPath, "utf8")));
console.log(
  `每日摘要驗證通過：${new Set(archive.reports.map((r) => r.date)).size} 日、${archive.reports.length} 個版本。`,
);
