import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { atomicJson, root, withLock } from "./lib.mjs";
import { RADAR_THREAD, validateReports } from "../src/reports.mjs";

export const reportPath = path.join(root, "public/reports/daily-market.json");
export function extractReports(thread, importedAt = new Date().toISOString()) {
  if (thread.thread?.id !== RADAR_THREAD) throw new Error("摘要來源對話不符");
  const groups = [];
  let current;
  const turns =
    thread.page?.order === "newest_first"
      ? [...thread.turns].reverse()
      : thread.turns;
  for (const turn of turns ?? []) {
    for (const item of turn.items ?? []) {
      if (item.type !== "agentMessage" || !item.text) continue;
      const text = item.text;
      if (/^# .*市場指標雷達/m.test(text.slice(0, 120))) {
        const match = text.slice(0, 400).match(/(20\d{2})\/(\d{2})\/(\d{2})/);
        current = match
          ? {
              date: `${match[1]}-${match[2]}-${match[3]}`,
              parts: [],
              messageIds: [],
            }
          : undefined;
        if (current) groups.push(current);
      }
      if (
        current &&
        (current.parts.length === 0 || /^## /m.test(text.slice(0, 120)))
      ) {
        if (text.includes("[truncated]") || text.includes("…[truncated]"))
          throw new Error("來源內容遭截斷，請增大讀取上限");
        current.parts.push(text);
        current.messageIds.push(item.id);
      }
    }
  }
  return groups.map((g) => {
    const originalText = g.parts.join("\n\n");
    if (!/五行摘要/.test(originalText) || !/不構成投資建議/.test(originalText))
      throw new Error(`${g.date} 摘要不完整，保留既有版本`);
    return {
      date: g.date,
      title: "Market Indicator Agent｜市場指標雷達",
      originalText,
      messageIds: g.messageIds,
      importedAt,
      revision: createHash("sha256").update(originalText).digest("hex"),
    };
  });
}
export async function importReports(thread, output = reportPath) {
  return withLock(async () => {
    let archive;
    try {
      archive = validateReports(JSON.parse(await readFile(output, "utf8")));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      archive = {
        schemaVersion: 1,
        source: { threadId: RADAR_THREAD, title: "市場指標雷達" },
        reports: [],
      };
    }
    const incoming = extractReports(thread);
    if (!incoming.length)
      throw new Error("找不到完整且有日期的每日雷達；不修改封存");
    const reports = [...archive.reports];
    let added = 0;
    for (const r of incoming) {
      if (
        !reports.some((p) => p.date === r.date && p.revision === r.revision)
      ) {
        reports.push(r);
        added++;
      }
    }
    const next = validateReports({ ...archive, reports });
    if (added) await atomicJson(output, next);
    return {
      added,
      dates: [...new Set(next.reports.map((r) => r.date))].sort(),
      revisions: next.reports.length,
    };
  }, output + ".lock");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const file = process.argv[2];
    let input = "";
    if (file) input = await readFile(file, "utf8");
    else for await (const chunk of process.stdin) input += chunk;
    console.log(
      JSON.stringify(await importReports(JSON.parse(input)), null, 2),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
