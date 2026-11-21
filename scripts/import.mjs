import { readFile } from "node:fs/promises";
import {
  loadData,
  withLock,
  atomicJson,
  dataPath,
  mergeObservations,
} from "./lib.mjs";
import { validateDataset } from "../src/schema.mjs";
const file = process.argv[2];
if (!file || !process.argv.includes("--reviewed")) {
  console.error(
    "用法：npm run data:import -- 檔案.json --reviewed（表示你已逐筆核對官方來源、期間、單位及發布時間）",
  );
  process.exitCode = 1;
} else
  await withLock(async () => {
    const input = JSON.parse(await readFile(file, "utf8"));
    const data = await loadData();
    if (!Array.isArray(input.observations) || !Array.isArray(input.events))
      throw new Error("需 observations 與 events 陣列");
    const allowed = [
      "treasury.gov",
      "fred.stlouisfed.org",
      "twse.com.tw",
      "tpex.org.tw",
      "taifex.com.tw",
      "cmegroup.com",
      "tsmc.com",
      "nvidia.com",
      "microsoft.com",
      "abc.xyz",
      "aboutamazon.com",
      "atmeta.com",
      "krx.co.kr",
      "nasdaq.com",
    ];
    for (const o of [...input.observations, ...input.events]) {
      const host = new URL(o.source.url).hostname;
      if (!allowed.some((h) => host === h || host.endsWith("." + h)))
        throw new Error("不在官方來源允許清單：" + host);
    }
    if (input.observations.some((o) => o.method !== "reviewed-import"))
      throw new Error("匯入 method 必須為 reviewed-import");
    const eventMap = new Map(data.events.map((e) => [e.id, e]));
    for (const e of input.events) {
      if (
        eventMap.has(e.id) &&
        JSON.stringify(eventMap.get(e.id)) !== JSON.stringify(e)
      )
        throw new Error("事件 ID 已存在且內容不同；修訂請用新 ID 保留歷史");
      eventMap.set(e.id, e);
    }
    const next = validateDataset({
      ...data,
      generatedAt: new Date().toISOString(),
      observations: mergeObservations(data.observations, input.observations),
      events: [...eventMap.values()],
    });
    await atomicJson(dataPath, next);
    console.log("已匯入並通過 schema 驗證；請執行 npm test 與 npm run build。");
  }).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
