import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  latestReports,
  reportBlocks,
  RADAR_URL,
  validateReports,
} from "./reports.mjs";

type Archive = ReturnType<typeof validateReports>;
const time = (s: string) =>
  new Date(s).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
  });
const colors = ["#bedb95", "#7db8d3", "#dfa788", "#b9a0dc"];
function ReportChart({ chart }: { chart: any }) {
  const Graph = chart.chartType === "bar" ? BarChart : LineChart;
  return (
    <figure className="summary-chart" aria-label={chart.meta.title}>
      <figcaption>
        <strong>{chart.meta.title}</strong>
        <span>{chart.meta.description}</span>
      </figcaption>
      <div className="summary-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <Graph
            data={chart.data}
            margin={{ top: 16, right: 16, left: 0, bottom: 12 }}
          >
            <CartesianGrid stroke="#344039" strokeDasharray="3 3" />
            <XAxis
              dataKey={chart.xKey}
              tick={{ fill: "#a9b8af", fontSize: 11 }}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#a9b8af", fontSize: 11 }}
              width={48}
              domain={[
                chart.yAxisMin ?? (chart.chartType === "bar" ? 0 : "auto"),
                chart.yAxisMax ?? "auto",
              ]}
            />
            <Tooltip
              contentStyle={{
                background: "#19221f",
                borderColor: "#46544b",
                color: "#e6eee9",
              }}
            />
            <Legend />
            {chart.series.map((s: any, i: number) =>
              chart.chartType === "bar" ? (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={`${s.label}${s.valuePrefix || s.valueSuffix ? `（${s.valuePrefix ?? ""}${s.valueSuffix ?? ""}）` : ""}`}
                  fill={colors[i % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  key={s.dataKey}
                  type="linear"
                  dataKey={s.dataKey}
                  name={`${s.label}${s.valuePrefix || s.valueSuffix ? `（${s.valuePrefix ?? ""}${s.valueSuffix ?? ""}）` : ""}`}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              ),
            )}
          </Graph>
        </ResponsiveContainer>
      </div>
      <details>
        <summary>查看圖表數值</summary>
        <div className="summary-table">
          <table>
            <thead>
              <tr>
                <th>{chart.xKey}</th>
                {chart.series.map((s: any) => (
                  <th key={s.dataKey}>
                    {s.label}
                    {s.valuePrefix}
                    {s.valueSuffix}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.data.map((row: any, i: number) => (
                <tr key={i}>
                  <td>{row[chart.xKey]}</td>
                  {chart.series.map((s: any) => (
                    <td key={s.dataKey}>{row[s.dataKey] ?? "缺值"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
export default function DailySummary({
  date,
  onDate,
  refreshKey,
}: {
  date: string;
  onDate: (date: string) => void;
  refreshKey: string;
}) {
  const [archive, setArchive] = useState<Archive | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}reports/daily-market.json`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw new Error(`摘要讀取失敗（${response.status}）`);
        const next = validateReports(await response.json());
        if (!controller.signal.aborted) setArchive(next);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "摘要格式錯誤");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [refreshKey, retry]);
  const reports = archive ? latestReports(archive) : [];
  const report = reports.find((r) => r.date === date);
  const versions = archive?.reports.filter((r) => r.date === date).length ?? 0;
  const blocks = report ? reportBlocks(report.originalText) : [];
  return (
    <section className="daily-summary" aria-label="每日市場摘要內容">
      <div className="summary-toolbar">
        <div>
          <span className="eyebrow lime">DAILY MARKET BRIEF</span>
          <h2>每天的市場脈絡，集中閱讀。</h2>
          <p>保留每日雷達的文字、表格與圖表，按摘要日期回看。</p>
        </div>
        <label>
          歷史摘要
          <select
            aria-label="歷史摘要日期"
            value={report ? date : ""}
            onChange={(e) => onDate(e.target.value)}
          >
            <option value="" disabled>
              選擇摘要日期
            </option>
            {reports.map((r) => (
              <option key={r.date} value={r.date}>
                {r.date}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="summary-notice">
        <strong>原文封存 · 尚未逐項複核</strong>
        <p>
          此處保存 ChatGPT「市場指標雷達」的原始摘要。文字中的行情、分析與
          Regime
          屬當時報告紀錄，可能與指標卡片口徑或後續修訂不同，不會寫入行情資料或參與系統風險計算。引用標籤無法轉出完整來源網址時，請回原文查看。
        </p>
      </div>
      <div className="summary-sync">
        <span>
          本機同步排程：每日台灣 09:15／18:15；需 Codex
          可執行並能讀取原對話，可能延後。
        </span>
        <span>
          最新已同步摘要：{reports[0]?.date ?? "尚無"}；同步於{" "}
          {reports[0] ? time(reports[0].importedAt) : "—"}
        </span>
      </div>
      {loading && <p role="status">正在載入每日摘要…</p>}
      {error && (
        <div className="error-banner" role="alert">
          {error}。{archive ? "保留上次成功載入內容。" : "尚未載入摘要。"}
          <button onClick={() => setRetry((n) => n + 1)}>重試摘要</button>
        </div>
      )}
      {!loading && !report && !error && (
        <div className="summary-empty">
          <h3>{date} 尚未同步每日摘要</h3>
          <p>不會把前一日摘要標成今日內容。你可以選擇已封存的日期閱讀。</p>
          {reports[0] && (
            <button className="button" onClick={() => onDate(reports[0].date)}>
              查看最新摘要（{reports[0].date}）
            </button>
          )}
        </div>
      )}
      {report && (
        <>
          <div className="summary-meta">
            <span>
              摘要日期 <strong>{report.date}</strong> · 匯入{" "}
              {time(report.importedAt)}（台灣） · {versions} 個封存版本
              {` · 統一閱讀格式 · ${blocks.filter((b) => b.kind === "chart").length} 張圖表`}
            </span>
            <a href={RADAR_URL} target="_blank" rel="noreferrer">
              查看原對話 ↗
            </a>
          </div>
          <article className="summary-article">
            {blocks.map((b, i) =>
              b.kind === "chart" ? (
                <ReportChart key={i} chart={b.chart} />
              ) : (
                <Markdown
                  key={i}
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  components={{
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="summary-table">
                        <table>{children}</table>
                      </div>
                    ),
                    img: () => (
                      <span className="muted">〔原文圖片請回原對話查看〕</span>
                    ),
                  }}
                >
                  {b.text}
                </Markdown>
              ),
            )}
          </article>
        </>
      )}
    </section>
  );
}
