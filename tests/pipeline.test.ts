// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateDataset } from "../src/schema.mjs";
import {
  parseTreasury,
  parseFred,
  parseTwseMonth,
  parseFlow,
  parseStructure,
  parseMargin,
} from "../scripts/providers.mjs";
import {
  mergeObservations,
  numeric,
  rocDate,
  withLock,
} from "../scripts/lib.mjs";
import { update } from "../scripts/update.mjs";
import { dataset, obs } from "./fixtures";
const ctx = {
  url: "https://example.com/fixture",
  retrievedAt: "2026-11-21T08:00:00Z",
  rawHash: "test-only",
};
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("資料 schema", () => {
  it("拒絕錯誤單位、未來觀測、錯誤日期與以零代表缺值", () => {
    for (const o of [
      obs("taiex", "2026-11-20", 1, { unit: "USD" }),
      obs("taiex", "2026-11-22", 1),
      obs("taiex", "2026-02-30", 1),
      obs("taiex", "2026-11-20", 0, { status: "missing" }),
    ])
      expect(() => validateDataset(dataset([o]))).toThrow();
  });
  it("FedWatch 必須同會議三種情境合計 100%，不可殘缺", () => {
    const rows = [
      obs("fedCut", "2026-11-20", 30, { meetingDate: "2026-12-09" }),
      obs("fedHold", "2026-11-20", 60, { meetingDate: "2026-12-09" }),
      obs("fedHike", "2026-11-20", 10, { meetingDate: "2026-12-09" }),
    ];
    expect(() => validateDataset(dataset(rows))).not.toThrow();
    expect(() => validateDataset(dataset(rows.slice(1)))).toThrow();
    expect(() =>
      validateDataset(
        dataset([...rows.slice(0, 2), { ...rows[2], value: 11 }]),
      ),
    ).toThrow();
  });
  it("重跑不重複入庫，來源修訂另存 vintage", () => {
    const a = obs("taiex", "2026-11-20", 1);
    expect(
      mergeObservations(
        [a],
        [
          {
            ...a,
            retrievedAt: "2026-11-21T09:00:00Z",
            vintage: "2026-11-21T09:00:00Z",
          },
        ],
      ),
    ).toHaveLength(1);
    expect(
      mergeObservations(
        [a],
        [{ ...a, value: 2, vintage: "2026-11-21T09:00:00Z" }],
      ),
    ).toHaveLength(2);
  });
  it("人工匯入需提供發布時間與核對證據", () => {
    expect(() =>
      validateDataset(
        dataset([
          obs("tsmcRevenue", "2026-10-31", 1, {
            method: "reviewed-import",
            period: "2026-10",
          }),
        ]),
      ),
    ).toThrow();
  });
});
describe("官方端點解析防漂移", () => {
  it("Treasury XML 可讀帶型別屬性與 null 數值", () => {
    const xml =
      '<feed><entry><content><m:properties><d:NEW_DATE m:type="Edm.DateTime">2026-11-20T00:00:00</d:NEW_DATE><d:BC_2YEAR m:type="Edm.Double">4</d:BC_2YEAR><d:BC_10YEAR m:type="Edm.Double">4.1</d:BC_10YEAR><d:BC_30YEAR m:null="true"/></m:properties></content></entry></feed>';
    expect(
      parseTreasury(xml, ctx, "2026-11-01", "2026-11-21").map((o) => o.value),
    ).toEqual([4, 4.1, null]);
  });
  it("FRED 空白是假日缺報，不能轉成 0；HTML 不能當 CSV", () => {
    expect(
      parseFred(
        "observation_date,TEST\n2026-11-19,\n2026-11-20,4.1",
        "us10y",
        "TEST",
        ctx,
        "2026-11-01",
        "2026-11-21",
      ).map((o) => o.value),
    ).toEqual([4.1]);
    expect(() =>
      parseFred(
        "<html>error</html>",
        "us10y",
        "TEST",
        ctx,
        "2026-11-01",
        "2026-11-21",
      ),
    ).toThrow();
  });
  it("TWSE 成交金額及股數單位正確轉換，日期民國轉西元", () => {
    const j = {
      stat: "OK",
      fields: [
        "日期",
        "成交股數",
        "成交金額",
        "成交筆數",
        "發行量加權股價指數",
      ],
      data: [["115/11/20", "1,000,000,000", "100,000,000,000", "1", "20,000"]],
    };
    expect(
      parseTwseMonth(j, ctx, "2026-11-01", "2026-11-21").map((o) => o.value),
    ).toEqual([20000, 10, 1000]);
    expect(rocDate("1151120")).toBe("2026-11-20");
    expect(numeric("")).toBeNull();
  });
  it("廣度只取股票欄、排除括號漲跌停，融資仟元轉億元", () => {
    const j = {
      stat: "OK",
      date: "20261120",
      tables: [
        {
          title: "漲跌證券數合計",
          fields: ["類型", "整體市場", "股票"],
          data: [
            ["上漲(漲停)", "1,000(20)", "80(10)"],
            ["下跌(跌停)", "500(20)", "20(5)"],
          ],
        },
      ],
    };
    expect(
      parseStructure(JSON.stringify(j), ctx, "2026-11-20").map((o) => o.value),
    ).toEqual([80, 20]);
    expect(
      parseMargin(
        JSON.stringify({
          stat: "OK",
          date: "20261120",
          tables: [
            {
              fields: ["項目", "今日餘額"],
              data: [["融資金額(仟元)", "100,000,000"]],
            },
          ],
        }),
        ctx,
        "2026-11-20",
      )[0].value,
    ).toBe(1000);
  });
  it("回傳其他日期、格式變動或錯誤頁時拒絕入庫", () => {
    expect(() =>
      parseFlow('{"stat":"OK","date":"20261119"}', ctx, "2026-11-20"),
    ).toThrow();
    expect(() =>
      parseStructure(
        '{"stat":"OK","date":"20261120","tables":[]}',
        ctx,
        "2026-11-20",
      ),
    ).toThrow();
  });
});
describe("管線整合", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-21T08:00:00Z"));
  });
  it("部分失敗保留舊資料，成功資料可入庫；重跑冪等", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "radar-test-"));
    dirs.push(dir);
    const a = obs("taiex", "2026-11-19", 100);
    await writeFile(
      path.join(dir, "history.json"),
      JSON.stringify(dataset([a])),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    const options = {
      storageDir: dir,
      start: "2026-11-19",
      end: "2026-11-20",
      providerFns: {
        good: async () => [obs("taiex", "2026-11-20", 101)],
        bad: async () => {
          throw new Error("HTTP 503");
        },
      },
    };
    await update(options);
    await update(options);
    const d = JSON.parse(
      await readFile(path.join(dir, "history.json"), "utf8"),
    );
    expect(d.observations).toHaveLength(2);
    expect(d.runs.at(-1).status).toBe("partial");
    expect(d.observations[0].value).toBe(100);
  });
  it("鎖定期間拒絕另一個更新", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "radar-lock-"));
    dirs.push(dir);
    const file = path.join(dir, ".update.lock");
    await withLock(async () => {
      await expect(withLock(async () => {}, file)).rejects.toThrow(
        "更新已在執行",
      );
    }, file);
  });
});
