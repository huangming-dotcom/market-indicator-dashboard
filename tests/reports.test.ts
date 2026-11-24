// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractReports, importReports } from "../scripts/import-reports.mjs";
import {
  RADAR_THREAD,
  reportBlocks,
  normalizeReportChart,
  validateReports,
} from "../src/reports.mjs";
const body =
  "# 📡 市場指標雷達\n\n2026/11/23（一）\n\n## 五行摘要\n\n📊 Data｜來源待複核，不能當作即時行情。\n\n" +
  "摘要內容。".repeat(25) +
  "\n本報告不構成投資建議。";
const thread = (text = body) => ({
  thread: { id: RADAR_THREAD },
  page: { order: "newest_first" },
  turns: [{ items: [{ type: "agentMessage", id: "report-message", text }] }],
});
describe("每日摘要封存", () => {
  it("相容中英文日報標頭、三級續篇及純文字續篇，原文和訊息 ID 不遺漏", () => {
    const start =
      "# 📡 Market Indicator Agent｜Morning Market Radar\n\n2026-11-24（二）\n\n## ① 變化\n" +
      "內容。".repeat(40);
    const parts = [
      start,
      "### USD/TWD\n原文數據，不改寫。",
      "補充原文，不必另有標題。",
      "### 補充核實\n## 五行摘要\n本報告不構成投資建議。",
    ];
    const input = {
      thread: { id: RADAR_THREAD },
      page: { order: "newest_first" },
      turns: [
        {
          items: parts.map((text, i) => ({
            type: "agentMessage",
            id: `part-${i}`,
            text,
          })),
        },
      ],
    };
    const [r] = extractReports(input, "2026-11-24T02:00:00Z");
    expect(r.originalText).toBe(parts.join("\n\n"));
    expect(r.messageIds).toEqual(["part-0", "part-1", "part-2", "part-3"]);
    expect(r.formatVersion).toBe(2);
  });
  it("遇到使用者訊息就停止併入舊報告，避免把後續無關內容合併", () => {
    const input = thread();
    input.turns[0].items.push(
      { type: "userMessage", id: "u", text: "其他問題" },
      { type: "agentMessage", id: "unrelated", text: "### 無關回答\n不應匯入" },
    );
    expect(extractReports(input)[0].originalText).toBe(body);
  });
  it("圖表缺少 meta 時只補章節標題，保留數字、null、單位與來源座標", () => {
    const chart = {
      chartType: "line",
      xKey: "date",
      series: [{ dataKey: "rate", label: "USD/TWD", valuePrefix: "NT$" }],
      yAxisMin: 32,
      yAxisMax: 34,
      data: [
        { date: "11/23", rate: 32.895 },
        { date: "11/24", rate: null },
      ],
    };
    const before = JSON.stringify(chart);
    const c = normalizeReportChart(
      chart,
      "### USD/TWD｜美元兌新台幣\n\n# 32.895\n",
    );
    expect(c.meta.title).toBe("USD/TWD｜美元兌新台幣");
    expect(
      normalizeReportChart(chart, "### 台積電月營收\n# 5,868.9億\n").meta.title,
    ).toBe("台積電月營收");
    expect(c.data).toEqual(chart.data);
    expect(c.series[0].valuePrefix).toBe("NT$");
    expect(c.yAxisMin).toBe(32);
    expect(JSON.stringify(chart)).toBe(before);
    expect(() => normalizeReportChart({ ...chart, yAxisMax: 31 })).toThrow();
    expect(() =>
      normalizeReportChart({
        ...chart,
        data: [{ date: "11/23", rate: "32.895" }],
      }),
    ).toThrow();
    expect(() =>
      normalizeReportChart({ ...chart, meta: "execute code" }),
    ).toThrow();
  });
  it("依原文日期封存，支援多段文字，忽略預覽及非摘要訊息", () => {
    const input = thread(body.replace("本報告不構成投資建議。", ""));
    input.turns[0].items.push({
      type: "agentMessage",
      id: "continued",
      text: "## 結語\n本報告不構成投資建議。",
    });
    const [r] = extractReports(input, "2026-11-23T02:00:00Z");
    expect(r.date).toBe("2026-11-23");
    expect(r.messageIds).toHaveLength(2);
    expect(r.originalText).toContain("## 結語");
    expect(() => extractReports({ ...input, thread: { id: "other" } })).toThrow(
      "來源對話不符",
    );
  });
  it("拒絕不完整、未來與錯誤圖表，不產生零補值", () => {
    expect(() =>
      extractReports(thread(body.replace("不構成投資建議", "未完成"))),
    ).toThrow("不完整");
    const reports = extractReports(thread(), "2026-11-22T02:00:00Z");
    expect(() =>
      validateReports({
        schemaVersion: 1,
        source: { threadId: RADAR_THREAD, title: "市場指標雷達" },
        reports,
      }),
    ).toThrow();
    expect(() =>
      reportBlocks(
        'genui{"charts_widget_v2":{"content":{"chartType":"script"}}}',
      ),
    ).toThrow();
  });
  it("重跑冪等，修訂追加版本；失敗不修改已封存檔案", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "radar-reports-"));
    const file = path.join(dir, "reports.json");
    try {
      expect((await importReports(thread(), file)).added).toBe(1);
      const first = await readFile(file, "utf8");
      expect((await importReports(thread(), file)).added).toBe(0);
      expect(await readFile(file, "utf8")).toBe(first);
      expect(
        (await importReports(thread(body + "\n修訂說明"), file)).revisions,
      ).toBe(2);
      const revised = await readFile(file, "utf8");
      await expect(importReports(thread("not a report"), file)).rejects.toThrow(
        "找不到完整",
      );
      expect(await readFile(file, "utf8")).toBe(revised);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("轉換原文互動圖表及引用，保留缺值和順序", () => {
    const chart = {
      chartType: "line",
      meta: { title: "美債" },
      xKey: "date",
      series: [{ dataKey: "yield", label: "10Y" }],
      data: [{ date: "11/20", yield: null }],
    };
    const blocks = reportBlocks(
      `前文citeprivate-id\ngenui${JSON.stringify({ charts_widget_v2: { content: chart } })}\n後文`,
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "markdown",
      "chart",
      "markdown",
    ]);
    expect(blocks[0].text).toContain("引用見原文");
    expect(blocks[0].text).not.toContain("private-id");
    expect(blocks[1].chart?.data[0].yield).toBeNull();
  });
});
