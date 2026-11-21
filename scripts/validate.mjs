import { readFile } from "node:fs/promises";
import { dataPath } from "./lib.mjs";
import { validateDataset } from "../src/schema.mjs";
try {
  const d = validateDataset(JSON.parse(await readFile(dataPath, "utf8")));
  if (!d.observations.length)
    throw new Error("歷史資料為空，請先執行 data:update");
  console.log(
    `資料驗證通過：${d.observations.length} 筆觀測、${d.events.length} 筆事件、schema v${d.schemaVersion}`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
