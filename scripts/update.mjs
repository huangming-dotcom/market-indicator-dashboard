import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { dateSchema, validateDataset } from "../src/schema.mjs";
import {
  loadData,
  withLock,
  atomicJson,
  dataPath,
  root,
  today,
  mergeObservations,
} from "./lib.mjs";
import * as providers from "./providers.mjs";
export async function update({
  start,
  end,
  strict = false,
  providerFns,
  storageDir = root,
} = {}) {
  end = dateSchema.parse(end ?? today());
  start = dateSchema.parse(
    start ??
      new Date(Date.parse(end) - 150 * 86400000).toISOString().slice(0, 10),
  );
  if (start > end || end > today())
    throw new Error("日期區間無效，不能更新未來資料");
  const output =
    storageDir === root ? dataPath : path.join(storageDir, "history.json");
  return withLock(
    async () => {
      const data = await loadData(output),
        startedAt = new Date().toISOString(),
        id = randomUUID(),
        results = [],
        incoming = [];
      async function run(name, fn) {
        try {
          const rows = await fn();
          if (!rows.length) throw new Error("區間內無資料");
          validateDataset({
            ...data,
            observations: rows,
            events: [],
            runs: [],
          });
          incoming.push(...rows);
          results.push({ name, status: "success", count: rows.length });
          return rows;
        } catch (e) {
          results.push({
            name,
            status: "failed",
            count: 0,
            message: String(e.message).slice(0, 300),
          });
          return [];
        }
      }
      if (providerFns) {
        for (const [name, fn] of Object.entries(providerFns))
          await run(name, fn);
      } else {
        await run("Treasury", () => providers.treasury(start, end));
        for (const [metric, series] of [
          ["usdtwd", "DEXTAUS"],
          ["wti", "DCOILWTICO"],
          ["brent", "DCOILBRENTEU"],
          ["sp500", "SP500"],
          ["nasdaq", "NASDAQCOM"],
        ])
          await run("FRED " + series, () =>
            providers.fred(start, end, metric, series),
          );
        const tw = await run("TWSE 月成交", () =>
          providers.twseMonth(start, end),
        );
        const dates = [...new Set(tw.map((o) => o.date))].sort().slice(-6);
        if (dates.length) {
          for (const kind of ["flow", "breadth", "margin"])
            await run("TWSE " + kind, () => providers.twseDaily(dates, kind));
        }
        await run("TPEX 指數", () => providers.tpex(start, end));
      }
      const failures = results.filter((r) => r.status === "failed");
      const status =
        failures.length === 0
          ? "success"
          : failures.length === results.length
            ? "failed"
            : "partial";
      const finishedAt = new Date().toISOString();
      const next = validateDataset({
        ...data,
        generatedAt: finishedAt,
        observations: mergeObservations(data.observations, incoming),
        runs: [
          ...data.runs,
          { id, startedAt, finishedAt, status, providers: results },
        ].slice(-100),
      });
      // Preserve good history on partial failure; publish only after full schema validation.
      await atomicJson(output, next);
      await atomicJson(
        path.join(storageDir, "data/runs", id + ".json"),
        next.runs.at(-1),
      );
      console.log(
        JSON.stringify(
          {
            status,
            observations: next.observations.length,
            providers: results,
          },
          null,
          2,
        ),
      );
      if (strict && failures.length) process.exitCode = 1;
      return next;
    },
    path.join(storageDir, ".update.lock"),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const get = (k) => {
    const i = args.indexOf(k);
    return i < 0 ? undefined : args[i + 1];
  };
  update({
    start: get("--start"),
    end: get("--end"),
    strict: args.includes("--strict"),
  }).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
