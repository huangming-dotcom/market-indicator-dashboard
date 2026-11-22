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
import * as markets from "./market-providers.mjs";
import { yahooFxQuote } from "./yahoo-fx-quote.mjs";
import { GOOGLE_FUTURES, googleFutures } from "./google-finance.mjs";
import * as policyProviders from "./policy-providers.mjs";
import { readFile } from "node:fs/promises";
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
        incoming = [],
        policyIncoming = [];
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
      async function runPolicy(name, fn) {
        try {
          const rows = await fn();
          validateDataset({
            ...data,
            policy: rows,
            observations: [],
            events: [],
            runs: [],
          });
          policyIncoming.push(...rows);
          results.push({ name, status: "success", count: rows.length });
        } catch (e) {
          results.push({
            name,
            status: "failed",
            count: 0,
            message: String(e.message).slice(0, 300),
          });
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
        // FRED remains the historical fallback. The newer close source is merged last.
        await Promise.all(
          Object.keys(markets.YAHOO).map((id) =>
            run("Yahoo 收盤 " + id, () => markets.yahoo(start, end, id)),
          ),
        );
        await run("TAIFEX TX 外資未平倉", () => markets.taifex(start, end));
        await run("Yahoo USD/TWD 主報價", () => yahooFxQuote(start, end));
        await Promise.all(
          Object.keys(GOOGLE_FUTURES).map((id) =>
            run("Google 期貨報價 " + id, () => googleFutures(start, end, id)),
          ),
        );
        await run("TPEX 外資買賣超", () =>
          dates.length
            ? markets.tpexFlowHistory(dates)
            : markets.tpexFlow(start, end),
        );
        if (dates.length)
          await run("TPEX 股票市場廣度", () => markets.tpexBreadth(dates));
        const otc = await run("TPEX 儀表板融資與指數", () =>
          markets.tpexMargin(start, end),
        );
        if (!otc.some((o) => o.metricId === "tpex"))
          await run("TPEX 指數備援", () => providers.tpex(start, end));
        await run("CME FedWatch 精確快照", () => policyProviders.fedwatch(end));
        await runPolicy("Fed 官方 FOMC 公告", () =>
          policyProviders.fedPolicy(end),
        );
        await runPolicy("每日雷達核對補充", () =>
          policyProviders.reviewedPolicy(end),
        );
        const policySources = JSON.parse(
          await readFile(path.join(root, "data/policy-sources.json"), "utf8"),
        );
        for (const reference of policySources)
          await runPolicy("Reuters 政策補充 " + reference.date, () =>
            policyProviders.reportedFedwatch(reference, end),
          );
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
        policy: [
          ...new Map(
            [...(data.policy ?? []), ...policyIncoming].map((item) => [
              item.id,
              item,
            ]),
          ).values(),
        ].sort((a, b) => b.date.localeCompare(a.date)),
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
      // Partial source failures are published with per-indicator lag markers.
      // An entirely failed update must not replace the live deployment.
      if (status === "failed" && !providerFns) process.exitCode = 1;
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
