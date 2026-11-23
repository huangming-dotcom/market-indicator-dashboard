import { useEffect, useRef, useState } from "react";
import { sentimentRating } from "./sentiment.mjs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  ExternalLink,
  Globe2,
  History,
  Landmark,
  Layers3,
  Loader2,
  Menu,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  CATALOG,
  ACTIVE_METRICS as METRICS,
  GROUPS,
  RULE_VERSION,
} from "./catalog.mjs";
import OverviewBoard from "./OverviewBoard";
import PolicyPanel from "./PolicyPanel";
import DailySummary from "./DailySummary";
import { validateDataset } from "./schema.mjs";
import {
  alerts,
  breadth,
  calendarDays,
  formatChange,
  formatValue,
  history,
  regime,
  riskDirection,
  snapshot,
  taipeiToday,
  volumeRatio,
} from "./analytics";
import type { Dataset, Observation } from "./types";

const NAV = [
  { id: "overview", label: "市場總覽", icon: Layers3 },
  { id: "summary", label: "每日市場摘要", icon: CalendarDays },
  { id: "macro", label: "總經與利率", icon: Landmark },
  { id: "global", label: "全球股市", icon: Globe2 },
  { id: "taiwan", label: "台股資金與結構", icon: BarChart3 },
  { id: "history", label: "風險狀態歷史", icon: History },
  { id: "sources", label: "資料來源與品質", icon: Database },
];
const fmtTime = (s?: string | null) =>
  s
    ? new Date(s).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
      })
    : "未提供發布時間";
const toneFor = (value: number | null) =>
  value === null
    ? "muted"
    : value > 0
      ? "positive"
      : value < 0
        ? "negative"
        : "neutral";
const chartStyle = {
  background: "#19221f",
  border: "1px solid #3b4842",
  borderRadius: 10,
  color: "#e6eee9",
  fontSize: 14,
};
type Props = { data: Dataset; date: string; onSelect: (id: string) => void };

function Empty({
  text = "尚無可核實的歷史資料",
  small = false,
}: {
  text?: string;
  small?: boolean;
}) {
  return (
    <div className={"empty " + (small ? "small" : "")}>
      <Database size={small ? 18 : 27} />
      <span>{text}</span>
    </div>
  );
}
function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function SourceFoot({
  id,
  data,
  date,
}: {
  id: string;
  data: Dataset;
  date: string;
}) {
  const s = snapshot(data, id, date);
  return (
    <div className="source-foot">
      <span>
        {s.current?.date ?? "尚無觀測"} ·{" "}
        {s.current?.source.name ?? CATALOG[id].source.name}
        {s.expected && <small className="block">應到 {s.expected}</small>}
        {s.current?.quote && (
          <small className="block">
            報價 {fmtTime(s.current.quote.quotedAt)}（台灣）
          </small>
        )}
        {s.current?.sentiment?.updatedAt && (
          <small className="block">
            CNN 更新 {fmtTime(s.current.sentiment.updatedAt)}（台灣）
          </small>
        )}
      </span>
      {s.stale ? (
        <span className="badge warn">
          {s.expected ? `落後 ${s.lag ?? "?"} 交易日` : "逾期"}
        </span>
      ) : s.calendarUnknown ? (
        <span className="badge warn">日曆待更新</span>
      ) : s.valid ? (
        <span className="badge">
          {s.expected ? "最新收盤" : s.current?.quote ? "報價快照" : "來源資料"}
        </span>
      ) : (
        <span className="badge muted">缺值</span>
      )}
    </div>
  );
}
function SentimentGauge({ observation }: { observation?: Observation }) {
  const value = observation?.value,
    classification = sentimentRating(observation?.sentiment?.rating);
  return (
    <div className={`sentiment-box sentiment-${classification.tone}`}>
      <div className="flex-between">
        <strong>{classification.label}</strong>
        <span>0–100 · CNN 分類</span>
      </div>
      {value != null && (
        <div
          className="sentiment-meter"
          role="img"
          aria-label={`恐懼與貪婪指數 ${Math.round(value)}／100，${classification.label}`}
        >
          <i style={{ left: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
      )}
      <div className="sentiment-scale">
        <span>恐懼</span>
        <span>中性</span>
        <span>貪婪</span>
      </div>
    </div>
  );
}
function MetricCard({
  id,
  data,
  date,
  onSelect,
  variant = "full",
}: { id: string; variant?: string } & Props) {
  const s = snapshot(data, id, date),
    m = CATALOG[id],
    risk = riskDirection(id, s.change, s.stale);
  return (
    <button
      className={"metric-card card-" + variant}
      onClick={() => onSelect(id)}
      aria-label={`檢視${m.label}詳細資料`}
    >
      <div className="flex-between">
        <span className="metric-name">{m.label}</span>
        <TrendingUp size={17} />
      </div>
      <div
        className={"metric-value " + (s.current?.value == null ? "muted" : "")}
      >
        {formatValue(id, s.current?.value)}
        <span>{m.unit}</span>
      </div>
      <div className="metric-compare">
        <strong className={toneFor(s.change)}>
          {formatChange(id, s.change)}
        </strong>
        <span>
          {s.current?.sentiment?.previousClose !== undefined
            ? "較 CNN 前收基準"
            : m.quoteSymbol
              ? (m.quoteChangeLabel ?? "Google 1D（來源基準）")
              : "較前一交易觀測"}
        </span>
      </div>
      {m.sentimentIndex && <SentimentGauge observation={s.current} />}
      {variant === "trend" && (
        <div className="sparkline" aria-label="近 20 筆交易觀測走勢">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={history(data, m.trendMetricId ?? id, date).slice(-20)}
            >
              <Line
                dataKey="value"
                type="linear"
                stroke="#ccf876"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mini-compare">
        <span>
          {s.current?.sentiment?.previousClose !== undefined
            ? `CNN 前收基準 ${formatValue(id, s.current.sentiment.previousClose)}`
            : m.quoteSymbol
              ? `來源基準 ${formatValue(id, s.current?.quote?.referencePrice)}`
              : `前值 ${s.previous?.date ?? "—"} · ${formatValue(id, s.previous?.value)}`}
        </span>
        <span className={risk.tone}>{risk.label}</span>
      </div>
      <SourceFoot id={id} data={data} date={date} />
      {["wti", "brent", "usdtwd"].includes(id) && (
        <p className="card-definition">
          {id === "usdtwd"
            ? "1 USD 對應 TWD · 日線口徑見來源，非台北收盤"
            : "EIA 現貨 · 非期貨，依來源發布日期更新"}
        </p>
      )}
      {m.quoteSymbol && (
        <p className="card-definition">
          {m.quoteProvider === "Yahoo"
            ? "Yahoo 主報價快照 · 非台北收盤；日線趨勢另列"
            : "期貨最新／延遲快照 · 非現貨、非結算價"}
        </p>
      )}
      {m.sentimentIndex && (
        <p className="card-definition">CNN 美國股市情緒 · 分數四捨五入顯示</p>
      )}
    </button>
  );
}
function YieldPanel({ data, date, onSelect }: Props) {
  const dates = [
    ...new Set(
      ["us2y", "us10y", "us30y"].flatMap((id) =>
        history(data, id, date)
          .slice(-5)
          .map((o) => o.date),
      ),
    ),
  ].sort();
  const points = dates.map((d) => ({
    date: d.slice(5),
    ...Object.fromEntries(
      ["us2y", "us10y", "us30y"].map((id) => [
        id,
        history(data, id, date).find((o) => o.date === d)?.value ?? null,
      ]),
    ),
  }));
  return (
    <section className="panel yield-panel">
      <div className="panel-heading">
        <div>
          <h3>美債殖利率走勢</h3>
          <p>最新 5 筆交易觀測 · 同口徑 Par Yield</p>
        </div>
        <span className="badge">單位 %</span>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: "#ccf876" }} />
          2Y
        </span>
        <span>
          <i style={{ background: "#78c9bd" }} />
          10Y
        </span>
        <span>
          <i style={{ background: "#9e9ee7" }} />
          30Y
        </span>
      </div>
      <div className="chart yield-chart">
        {points.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#2b3732"
                strokeDasharray="3 6"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#93a59b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#93a59b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={chartStyle} />
              {["us2y", "us10y", "us30y"].map((id, i) => (
                <Line
                  key={id}
                  name={CATALOG[id].label}
                  type="linear"
                  dataKey={id}
                  stroke={["#ccf876", "#78c9bd", "#9e9ee7"][i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>天期</th>
              <th>最新</th>
              <th>前一觀測</th>
              <th>1 日變化</th>
              <th>5 日變化</th>
            </tr>
          </thead>
          <tbody>
            {["us2y", "us10y", "us30y"].map((id) => {
              const s = snapshot(data, id, date);
              return (
                <tr key={id} onClick={() => onSelect(id)}>
                  <td>
                    <button className="text-button">{CATALOG[id].label}</button>
                  </td>
                  <td>{formatValue(id, s.current?.value)}%</td>
                  <td>{formatValue(id, s.previous?.value)}%</td>
                  <td>{formatChange(id, s.change)}</td>
                  <td>{formatChange(id, s.five)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="panel-note">
        5 日變化需 6 筆交易觀測；利率升降需結合股市判讀。缺值不連線。
      </p>
    </section>
  );
}
function FedPanel({ data, date, onSelect }: Props) {
  const report = (data.policy ?? []).find(
    (item) => item.kind === "fedwatch-commentary" && item.date <= date,
  );
  const meeting =
    snapshot(data, "fedHold", date).current?.meetingDate ?? report?.meetingDate;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>FedWatch 政策機率</h3>
          <p>
            {meeting
              ? `目標會議 ${meeting}`
              : "精確機率尚未串接；可查看官方工具與下方政策補充"}
          </p>
        </div>
        <Landmark size={20} className="muted" />
      </div>
      {report && (
        <div className="policy-summary">
          <span className="badge warn">{report.date} 報導補充・非精確機率</span>
          <p>{report.summary}</p>
          <a
            href={report.source.url}
            className="source-link"
            target="_blank"
            rel="noreferrer"
          >
            核對報導原文 <ExternalLink size={13} />
          </a>
        </div>
      )}
      <div className="fed-rows">
        {["fedCut", "fedHold", "fedHike"].map((id) => {
          const s = snapshot(data, id, date);
          return (
            <button key={id} className="fed-row" onClick={() => onSelect(id)}>
              <div className="flex-between">
                <span>{CATALOG[id].label}</span>
                <strong>{formatValue(id, s.current?.value)} %</strong>
              </div>
              <div className="progress">
                <div style={{ width: `${s.current?.value ?? 0}%` }} />
              </div>
              <div className="mini-compare">
                <span>{s.current?.date ?? "尚未串接完整機率快照"}</span>
                <span>{formatChange(id, s.change)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="info-box">
        <ShieldCheck size={17} />
        <p>
          同會議、同觀測時間才比較。報導中的「接近
          100%」保留為文字，不填成精確數值；FOMC 官方公告與 Reuters
          補充列於下方。
        </p>
      </div>
      <a
        className="source-link"
        href={CATALOG.fedHold.source.url}
        target="_blank"
        rel="noreferrer"
      >
        開啟 CME 官方機率表 <ExternalLink size={14} />
      </a>
    </section>
  );
}
function GlobalPanel(props: Props) {
  return (
    <>
      <SectionTitle eyebrow="GLOBAL MARKETS" title="全球市場脈動">
        <span className="meta">各市場當地最近觀測，非同步即時報價</span>
      </SectionTitle>
      <div className="market-grid">
        {["sp500", "nasdaq", "sox", "kospi", "nikkei", "taiex", "tpex"].map(
          (id) => {
            const s = snapshot(props.data, id, props.date);
            return (
              <button
                key={id}
                onClick={() => props.onSelect(id)}
                className={
                  "market-tile " + (s.valid ? toneFor(s.change) : "muted")
                }
              >
                <span>{CATALOG[id].label}</span>
                <strong>{formatChange(id, s.change)}</strong>
                <div>
                  {formatValue(id, s.current?.value)}
                  <small> 點</small>
                </div>
                <footer>
                  {s.current?.date ?? "缺值・待匯入"}
                  {s.stale ? ` · 落後 ${s.lag ?? "?"} 交易日` : ""}
                </footer>
              </button>
            );
          },
        )}
      </div>
    </>
  );
}
function TrendPanel({
  data,
  date,
  days,
  setDays,
  selected,
  setSelected,
}: {
  data: Dataset;
  date: string;
  days: number;
  setDays: (n: number) => void;
  selected: string;
  setSelected: (id: string) => void;
}) {
  const rows = history(data, CATALOG[selected].trendMetricId ?? selected, date);
  const byDate = new Map(rows.map((o) => [o.date, o.value]));
  const points = calendarDays(date, days).map((d) => ({
    date: d,
    value: byDate.get(d) ?? null,
  }));
  const has = points.some((p) => p.value !== null);
  return (
    <section className="panel">
      <div className="panel-heading trend-heading">
        <div>
          <h3>歷史趨勢</h3>
          <p>保留空白日期，不填補或插值 · {CATALOG[selected].unit}</p>
          {CATALOG[selected].trendMetricId && (
            <p>此圖為 Yahoo 歷史日線，與卡片主報價及當日漲跌分列。</p>
          )}
        </div>
        <div className="trend-controls">
          <div className="select-wrap">
            <select
              aria-label="趨勢指標"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {METRICS.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <div className="segmented" aria-label="趨勢期間">
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                aria-pressed={days === n}
                className={days === n ? "active" : ""}
                onClick={() => setDays(n)}
              >
                {n} 日
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart main-chart">
        {has ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ccf876" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ccf876" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#2b3732"
                strokeDasharray="3 6"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(s) => s.slice(5)}
                minTickGap={35}
                tick={{ fill: "#93a59b", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#93a59b", fontSize: 12 }}
                width={65}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={chartStyle}
                formatter={(v) => [
                  formatValue(selected, Number(v)),
                  CATALOG[selected].label,
                ]}
              />
              <Area
                name={CATALOG[selected].label}
                dataKey="value"
                stroke="#ccf876"
                fill="url(#area-fill)"
                strokeWidth={2}
                connectNulls={false}
                dot={days <= 7 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="所選期間沒有可核實的觀測值" />
        )}
      </div>
      <div className="source-foot">
        <span>
          {points[0].date} 至 {date} ·{" "}
          {
            rows.filter((o) => o.date >= points[0].date && o.value !== null)
              .length
          }{" "}
          筆有效觀測
        </span>
        <span>曆日視窗</span>
      </div>
    </section>
  );
}
function TaiwanPanel(props: Props & { showCards?: boolean }) {
  const { data, date, onSelect } = props;
  const flow = ["foreign", "trust", "dealer"].map((id) => {
    const s = snapshot(data, id, date);
    return {
      name: CATALOG[id].label.split("・")[0],
      current: s.current?.value ?? null,
      previous: s.previous?.value ?? null,
    };
  });
  const has = flow.some((f) => f.current !== null);
  const vol = volumeRatio(data, date);
  const br = breadth(data, date),
    otc = breadth(data, date, true);
  return (
    <>
      <SectionTitle
        eyebrow="TAIWAN CAPITAL & STRUCTURE"
        title="台股資金與市場結構"
      >
        <span className="badge">上市／上櫃分列</span>
      </SectionTitle>
      <div className="two-col">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>三大法人買賣超・上市</h3>
              <p>最新與前一交易觀測比較 · 億元</p>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: "#ccf876" }} />
                最新
              </span>
              <span>
                <i style={{ background: "#57665f" }} />
                前值
              </span>
            </div>
          </div>
          <div className="chart flow-chart">
            {has ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={flow}
                  barGap={5}
                  margin={{ left: -15, right: 10, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#2b3732" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#abb9b1", fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#93a59b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine y={0} stroke="#66786c" />
                  <Tooltip contentStyle={chartStyle} />
                  <Bar
                    name="前一觀測"
                    dataKey="previous"
                    fill="#57665f"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar name="最新觀測" dataKey="current" radius={[3, 3, 0, 0]}>
                    {flow.map((f) => (
                      <Cell
                        key={f.name}
                        fill={(f.current ?? 0) >= 0 ? "#ccf876" : "#f58f86"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
          <div className="inline-metrics">
            {["foreign", "trust", "dealer"].map((id) => {
              const s = snapshot(data, id, date);
              return (
                <button onClick={() => onSelect(id)} key={id}>
                  <span>{CATALOG[id].label.split("・")[0]}</span>
                  <strong className={toneFor(s.current?.value ?? null)}>
                    {formatValue(id, s.current?.value)}
                  </strong>
                  <small>{s.current?.date ?? "缺值"}</small>
                </button>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>廣度與量能</h3>
              <p>上漲／（上漲＋下跌）· 不含持平及無比價</p>
            </div>
            <Activity size={20} className="muted" />
          </div>
          {[
            [br, "上市", false],
            [otc, "上櫃", true],
          ].map(([v, label, isOtc]) => (
            <div className="breadth-row" key={String(label)}>
              <div className="flex-between">
                <span>{label}上漲占比</span>
                <strong>
                  {typeof v === "number" ? v.toFixed(1) + "%" : "— 缺值"}
                </strong>
              </div>
              <div
                className="breadth-track"
                role="img"
                aria-label={`${label}上漲占比 ${typeof v === "number" ? v.toFixed(1) + "%" : "缺值"}`}
              >
                <div
                  style={{ width: typeof v === "number" ? `${v}%` : "0%" }}
                />
              </div>
              <div className="mini-compare">
                <span>
                  漲{" "}
                  {formatValue(
                    isOtc ? "advancersOtc" : "advancers",
                    snapshot(data, isOtc ? "advancersOtc" : "advancers", date)
                      .current?.value,
                  )}{" "}
                  家
                </span>
                <span>
                  跌{" "}
                  {formatValue(
                    isOtc ? "declinersOtc" : "decliners",
                    snapshot(data, isOtc ? "declinersOtc" : "decliners", date)
                      .current?.value,
                  )}{" "}
                  家
                </span>
              </div>
            </div>
          ))}
          <div className="volume-stat">
            <div>
              <span>上市成交股數／20 日均量</span>
              <strong>
                {vol ? vol.ratio.toFixed(2) : "—"} <small>倍</small>
              </strong>
            </div>
            <BarChart3 size={35} />
          </div>
          <p className="panel-note">
            上櫃廣度統計四碼股票且有數值漲跌，排除 ETF、權證及無比價。 20
            筆交易觀測含當日；不足 20 筆顯示缺值。
            {vol ? `均量 ${vol.average.toFixed(2)} 億股` : "上市櫃不混算"}
          </p>
        </section>
      </div>
      {props.showCards !== false && (
        <div className="metrics-grid secondary">
          {["futures", "marginTw", "marginOtc", "foreignOtc"].map((id) => (
            <MetricCard {...props} key={id} id={id} />
          ))}
        </div>
      )}
    </>
  );
}
function RegimeHistory({
  data,
  date,
  days,
}: {
  data: Dataset;
  date: string;
  days: number;
}) {
  const dates = calendarDays(date, days).filter((d) =>
    data.observations.some((o) => o.date === d && o.value !== null),
  );
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Market Regime 歷史</h3>
          <p>最近 {days} 曆日 · 依目前資料版本重算 · 非當時可得資訊回測</p>
        </div>
        <span className="badge">{RULE_VERSION}</span>
      </div>
      <div className="regime-history">
        {dates.length ? (
          dates.map((d) => {
            const r = regime(data, d);
            return (
              <div
                key={d}
                className={
                  "regime-day " + r.label.toLowerCase().replace("-", "")
                }
                title={`${d}：${r.label}；覆蓋 ${r.coverage}/6`}
              >
                <i />
                <small>{d.slice(5)}</small>
                <span>{r.label === "資料不足" ? "不足" : r.label}</span>
              </div>
            );
          })
        ) : (
          <Empty />
        )}
      </div>
      <div className="regime-legend">
        <span className="positive">● Risk-on</span>
        <span className="neutral">● Neutral</span>
        <span className="negative">● Risk-off</span>
        <span className="muted">● 資料不足</span>
      </div>
      <details className="method">
        <summary>判定方法與限制</summary>
        <p>
          S&P 500、NASDAQ、加權指數的日變動以 ±0.3% 分為 +1／0／−1；USD/TWD
          反向計分。上市上漲占比 &gt;60% 為 +1、&lt;40% 為 −1；上市外資買賣超
          &gt;50 億為 +1、&lt;−50 億為 −1。至少 4／6 項且觀測日期落差不超過 3
          日才判定。有效輸入等權均分 ≥0.35 為 Risk-on、≤−0.35 為 Risk-off，其餘
          Neutral。資料逾期不計入。
        </p>
        <p>
          此規則為可調整的市場描述，未經預測能力驗證。歷史回補使用目前取得的修訂版本，不能視為當時已知訊號。
        </p>
      </details>
    </section>
  );
}
function Sources({ data, date }: Omit<Props, "onSelect">) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const rows = METRICS.filter(
    (m) =>
      (filter === "all" || !snapshot(data, m.id, date).valid) &&
      (m.label.toLowerCase().includes(query.toLowerCase()) ||
        m.id.includes(query.toLowerCase())),
  );
  return (
    <>
      <SectionTitle eyebrow="PROVENANCE & QUALITY" title="每個數字，都能追溯">
        <span className="badge">schema v1</span>
      </SectionTitle>
      <div className="quality-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋指標或代碼"
            aria-label="搜尋資料來源"
          />
        </label>
        <div className="segmented">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            全部指標
          </button>
          <button
            className={filter === "missing" ? "active" : ""}
            onClick={() => setFilter("missing")}
          >
            缺值／逾期
          </button>
        </div>
      </div>
      <section className="panel">
        <div className="table-scroll">
          <table className="source-table">
            <thead>
              <tr>
                <th>指標</th>
                <th>狀態／觀測日</th>
                <th>來源與口徑</th>
                <th>擷取時間（台灣）</th>
                <th>發布時間（台灣）</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const s = snapshot(data, m.id, date),
                  o = s.current;
                return (
                  <tr key={m.id}>
                    <td>
                      {m.label}
                      <small className="block muted">
                        {m.id} · {m.unit}
                      </small>
                    </td>
                    <td>
                      <span className={"badge " + (!s.valid ? "warn" : "")}>
                        {s.stale
                          ? s.expected
                            ? `落後 ${s.lag} 交易日`
                            : "逾期"
                          : s.calendarUnknown
                            ? "日曆待更新"
                            : s.valid
                              ? "有值"
                              : "缺值"}
                      </span>
                      <small className="block">{o?.date ?? "尚未取得"}</small>
                      {s.expected && (
                        <small className="block muted">應到 {s.expected}</small>
                      )}
                    </td>
                    <td>
                      <a
                        href={o?.source.url ?? m.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="source-link"
                      >
                        {o?.source.name ?? m.source.name}{" "}
                        <ExternalLink size={12} />
                      </a>
                      <small className="block muted">
                        {m.note ??
                          o?.reason ??
                          (o ? "原始來源數值" : "尚未接通／未核對，不補估值")}
                      </small>
                    </td>
                    <td>{o ? fmtTime(o.retrievedAt) : "—"}</td>
                    <td>
                      {o?.publishedAt
                        ? fmtTime(o.publishedAt)
                        : "來源未提供；非擷取時間"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty text="沒有符合的指標" small />}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>每日更新紀錄</h3>
            <p>原始回應 SHA-256 與擷取時間保存在資料管線封存檔</p>
          </div>
          <RefreshCw size={18} />
        </div>
        {data.runs.length ? (
          data.runs
            .slice(-5)
            .reverse()
            .map((r) => (
              <details className="run" key={r.id}>
                <summary>
                  <span>{fmtTime(r.finishedAt)}</span>
                  <span
                    className={
                      "badge " + (r.status !== "success" ? "warn" : "")
                    }
                  >
                    {r.status === "success"
                      ? "完成"
                      : r.status === "partial"
                        ? "部分成功"
                        : "失敗"}
                  </span>
                </summary>
                <ul>
                  {r.providers.map((p) => (
                    <li key={p.name}>
                      <span
                        className={
                          p.status === "success" ? "positive" : "negative"
                        }
                      >
                        {p.status === "success" ? "成功" : "失敗"}
                      </span>{" "}
                      {p.name} · {p.count} 筆 {p.message ?? ""}
                    </li>
                  ))}
                </ul>
              </details>
            ))
        ) : (
          <Empty small text="尚未執行每日資料更新" />
        )}
      </section>
    </>
  );
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [view, setView] = useState(
      window.location.hash === "#daily-summary" ? "summary" : "overview",
    ),
    [date, setDate] = useState(taipeiToday),
    [days, setDays] = useState(30),
    [selected, setSelected] = useState("taiex"),
    [detail, setDetail] = useState<string | null>(null),
    [mobile, setMobile] = useState(false),
    [loadedAt, setLoadedAt] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  async function reload() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}data/history.json`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`資料讀取失敗（${r.status}）`);
      setData(validateDataset(await r.json()) as Dataset);
      setLoadedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "資料格式錯誤");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  useEffect(() => {
    if (detail) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [detail]);
  const nav = (id: string) => {
    setView(id);
    window.history.replaceState(
      null,
      "",
      id === "summary"
        ? "#daily-summary"
        : window.location.pathname + window.location.search,
    );
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onSelect = (id: string) => {
    setDetail(id);
    setSelected(id);
  };
  const props = data ? { data, date, onSelect } : null;
  const risk = data ? regime(data, date) : null;
  const warnings = data ? alerts(data, date) : [];
  const count = data
    ? METRICS.filter((m) => snapshot(data, m.id, date).valid).length
    : 0;
  const availableDates = data
    ? [
        ...new Set(
          data.observations.filter((o) => o.value !== null).map((o) => o.date),
        ),
      ].sort()
    : [];
  const latest = availableDates.at(-1);
  const marketAlerts = warnings.filter((a) => a.kind === "market");
  const closeMetrics = METRICS.filter((m) => m.dailyMarket);
  const closeReady = data
    ? closeMetrics.filter((m) => snapshot(data, m.id, date).valid).length
    : 0;
  function exportSnapshot() {
    if (!data) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            selectedDate: date,
            regime: regime(data, date),
            observations: METRICS.map((m) => ({
              metric: m.id,
              ...snapshot(data, m.id, date),
            })),
            alerts: warnings,
            policy: (data.policy ?? []).filter((item) => item.date <= date),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-radar-${date}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav("overview");
          }}
        >
          <div className="brand-mark">
            <Radio size={23} />
          </div>
          <div>
            MARKET RADAR<span>市場指標雷達</span>
          </div>
        </a>
        <div className="workspace-label">MARKET INTELLIGENCE</div>
        <nav aria-label="主選單">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => nav(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              {view === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-status">
            <ShieldCheck size={20} />
            <div>
              資料品質優先<span>來源追溯 · 缺值透明</span>
            </div>
          </div>
          <div className="sidebar-footer">
            <div className="avatar">M</div>
            <div>
              Market Indicator Agent<small>研究工作台 · v1.0</small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="關閉選單"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="開啟選單"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>研究工作台</span>
            <span className="separator">/</span>
            <strong>{NAV.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="time-label">ASIA / TAIPEI</span>
            <button
              className="icon-button notification"
              aria-label={`檢視 ${warnings.length} 項提醒`}
              onClick={() => {
                nav("overview");
                setTimeout(
                  () =>
                    document
                      .getElementById("alerts")
                      ?.scrollIntoView({ behavior: "smooth" }),
                  50,
                );
              }}
            >
              <Bell size={19} />
              {warnings.length > 0 && <i />}
            </button>
            <div className="avatar">M</div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow lime">
                MARKET INDICATOR AGENT{" "}
                <span className="version">DAILY MONITOR</span>
              </div>
              <h1>
                {view === "overview"
                  ? "市場總覽"
                  : NAV.find((n) => n.id === view)?.label}
              </h1>
              <p>
                {view === "summary"
                  ? "每日重點、圖表與判讀，保留完整脈絡。"
                  : "看見市場變化，理解風險脈絡。"}
                <span className="desktop-inline">
                  數據、判讀、缺值，清楚分開。
                </span>
              </p>
            </div>
            <div className="page-actions">
              <label className="date-picker">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={date}
                  max={taipeiToday()}
                  min={availableDates[0]}
                  aria-label={view === "summary" ? "摘要日期" : "觀測日期"}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    if (value && value <= taipeiToday()) setDate(value);
                  }}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= taipeiToday())
                      setDate(e.target.value);
                  }}
                />
              </label>
              {view !== "summary" && (
                <button
                  className="button export"
                  onClick={exportSnapshot}
                  disabled={!data}
                >
                  <ArrowDownToLine size={16} />
                  匯出快照
                </button>
              )}
              <button
                className="icon-button refresh"
                disabled={loading}
                onClick={reload}
                aria-label="重新載入已發布資料"
              >
                <RefreshCw size={17} className={loading ? "spin" : ""} />
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              <TriangleAlert size={20} />
              <span>
                {error}。
                {data
                  ? "保留上次成功載入資料。"
                  : "請確認 public/data/history.json 已生成。"}
              </span>
              <button onClick={reload}>重試</button>
            </div>
          )}
          {loading && !data ? (
            <div className="loading">
              <Loader2 className="spin" />
              正在核對資料格式與來源…
            </div>
          ) : (
            props &&
            data && (
              <>
                {view !== "summary" && (
                  <>
                    <div className="data-strip">
                      <div>
                        <span className="badge">日資料・非即時行情</span>
                        <span>
                          選定 {date}{" "}
                          <span className="muted">
                            ／ 資料集最新 {latest ?? "缺值"}
                          </span>
                        </span>
                      </div>
                      <button onClick={() => nav("sources")}>
                        <span
                          className={
                            count < METRICS.length ? "warn" : "positive"
                          }
                        >
                          {count} / {METRICS.length} 指標可用
                        </span>
                        <span className="muted">
                          查看品質 <SlidersHorizontal size={14} />
                        </span>
                      </button>
                    </div>
                    <div
                      className="update-schedule"
                      aria-label="資料更新時間說明"
                    >
                      <span>每日更新（台灣）07:00／09:00／17:30／22:30</span>
                      <span>
                        已發布快照 {fmtTime(data.generatedAt)}
                        ；來源日期以各卡片為準，排程可能延後。
                      </span>
                    </div>
                    <div className="close-quality">
                      <span>
                        收盤資料到齊{" "}
                        <strong>
                          {closeReady} / {closeMetrics.length}
                        </strong>{" "}
                        · 依各市場交易日曆檢查
                      </span>
                      <button
                        className="text-button"
                        onClick={() => nav("sources")}
                      >
                        {data.runs.at(-1)?.status === "partial"
                          ? "部分來源待補；其他有效資料已更新"
                          : "查看每項應到日期與來源"}
                      </button>
                    </div>
                  </>
                )}
                {view === "summary" && (
                  <DailySummary
                    date={date}
                    onDate={setDate}
                    refreshKey={loadedAt}
                  />
                )}
                {view === "overview" && (
                  <>
                    <div className="overview-hero">
                      <section
                        className={
                          "regime-panel " +
                          risk!.label.toLowerCase().replace("-", "")
                        }
                      >
                        <div className="flex-between">
                          <span className="eyebrow">MARKET REGIME</span>
                          <span className="badge">規則推論</span>
                        </div>
                        <div className="risk-title">
                          <span className="risk-orbit">
                            <Activity size={24} />
                          </span>
                          <div>
                            <h2>{risk!.label}</h2>
                            <p>
                              {risk!.label === "資料不足"
                                ? "等待足夠且時間一致的訊號"
                                : risk!.label === "Risk-on"
                                  ? "有效訊號偏向風險承擔"
                                  : risk!.label === "Risk-off"
                                    ? "有效訊號偏向風險收斂"
                                    : "有效訊號呈現多空交錯"}
                            </p>
                          </div>
                        </div>
                        <div className="risk-meter">
                          <div className="meter-line" />
                          {risk!.score !== null && (
                            <i
                              style={{
                                left: `${((risk!.score + 1) / 2) * 100}%`,
                              }}
                            />
                          )}
                        </div>
                        <div className="meter-labels">
                          <span>RISK-OFF</span>
                          <span>NEUTRAL</span>
                          <span>RISK-ON</span>
                        </div>
                        <footer>
                          <span>
                            有效輸入{" "}
                            <strong>
                              {risk!.coverage} / {risk!.total}
                            </strong>
                          </span>
                          <span>{risk!.reason}</span>
                        </footer>
                      </section>
                      <section className="brief-panel">
                        <div className="eyebrow">TODAY'S READING</div>
                        <h3>先看風險，再看變化。</h3>
                        <p>
                          {marketAlerts.length
                            ? `目前有 ${marketAlerts.length} 項變動超過設定門檻，請搭配市場廣度與資金流核對。`
                            : "目前沒有可確認的門檻異常；缺值或資料不足不代表市場平穩。"}
                        </p>
                        <div className="brief-stats">
                          <div>
                            <strong>
                              {marketAlerts.length.toString().padStart(2, "0")}
                            </strong>
                            <span>市場異常</span>
                          </div>
                          <div>
                            <strong>{METRICS.length - count}</strong>
                            <span>缺值／逾期</span>
                          </div>
                          <div>
                            <strong>{risk!.coverage}/6</strong>
                            <span>風險覆蓋</span>
                          </div>
                        </div>
                        <div className="reading-note">
                          <ShieldCheck size={15} />
                          未引用對話示範數字 · 未知數值不補估
                        </div>
                      </section>
                    </div>
                    <OverviewBoard
                      data={data}
                      date={date}
                      renderCard={(id, style) => (
                        <MetricCard
                          key={id}
                          id={id}
                          variant={style}
                          {...props}
                        />
                      )}
                    />
                    <div className="macro-grid">
                      <YieldPanel {...props} />
                      <FedPanel {...props} />
                    </div>
                    <PolicyPanel data={data} date={date} />
                    <TrendPanel
                      data={data}
                      date={date}
                      days={days}
                      setDays={setDays}
                      selected={selected}
                      setSelected={setSelected}
                    />
                    <TaiwanPanel {...props} showCards={false} />
                  </>
                )}
                {view === "macro" && (
                  <>
                    <div className="macro-grid">
                      <YieldPanel {...props} />
                      <FedPanel {...props} />
                    </div>
                    <PolicyPanel data={data} date={date} />
                    <div className="metrics-grid secondary">
                      {["usdtwdQuote", "wti", "brent"].map((id) => (
                        <MetricCard key={id} id={id} {...props} />
                      ))}
                    </div>
                    <TrendPanel
                      data={data}
                      date={date}
                      days={days}
                      setDays={setDays}
                      selected={selected}
                      setSelected={setSelected}
                    />
                  </>
                )}
                {view === "global" && (
                  <>
                    <GlobalPanel {...props} />
                    <TrendPanel
                      data={data}
                      date={date}
                      days={days}
                      setDays={setDays}
                      selected={selected}
                      setSelected={setSelected}
                    />
                  </>
                )}
                {view === "taiwan" && (
                  <>
                    <TaiwanPanel {...props} />
                    <TrendPanel
                      data={data}
                      date={date}
                      days={days}
                      setDays={setDays}
                      selected={selected}
                      setSelected={setSelected}
                    />
                  </>
                )}
                {(view === "overview" || view === "history") && (
                  <>
                    <SectionTitle
                      eyebrow="RISK MONITOR"
                      title="風險狀態與異常追蹤"
                    >
                      <div className="segmented">
                        {[7, 30, 90].map((n) => (
                          <button
                            key={n}
                            className={days === n ? "active" : ""}
                            onClick={() => setDays(n)}
                          >
                            {n} 日
                          </button>
                        ))}
                      </div>
                    </SectionTitle>
                    <RegimeHistory data={data} date={date} days={days} />
                    <section id="alerts" className="panel">
                      <div className="panel-heading">
                        <div>
                          <h3>異常與資料品質提醒</h3>
                          <p>單日門檻與逾期檢查，不將缺值視為正常</p>
                        </div>
                        <span className="badge warn">{warnings.length} 項</span>
                      </div>
                      {warnings.length ? (
                        <div className="alerts">
                          {warnings.map((a) => (
                            <button
                              onClick={() => onSelect(a.id)}
                              key={a.id + a.kind}
                            >
                              <TriangleAlert
                                size={18}
                                className={
                                  a.kind === "market" ? "negative" : "warn"
                                }
                              />
                              <div>
                                <strong>{a.title}</strong>
                                <p>{a.detail}</p>
                              </div>
                              <span className="badge">
                                {a.kind === "market" ? "市場異常" : "資料品質"}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty
                          small
                          text="沒有已確認的門檻異常；仍需留意未取得的指標"
                        />
                      )}
                    </section>
                  </>
                )}
                {view === "sources" && <Sources data={data} date={date} />}
                <footer className="page-footer">
                  <span>
                    <Radio size={16} /> MARKET RADAR{" "}
                    <span className="muted">資料有據，判讀有界。</span>
                  </span>
                  <span>
                    資料檔更新 {fmtTime(data.generatedAt)}
                    <br />
                    <small>本頁載入 {fmtTime(loadedAt)} · 研究用途</small>
                  </span>
                </footer>
              </>
            )
          )}
        </main>
      </div>
      <dialog
        ref={dialogRef}
        onCancel={() => setDetail(null)}
        onClose={() => setDetail(null)}
        aria-labelledby="detail-title"
      >
        {detail &&
          data &&
          (() => {
            const s = snapshot(data, detail, date),
              m = CATALOG[detail],
              o = s.current;
            return (
              <>
                <div className="dialog-top">
                  <div>
                    <span className="eyebrow">INDICATOR DETAIL</span>
                    <h2 id="detail-title">{m.label}</h2>
                  </div>
                  <button
                    className="icon-button"
                    autoFocus
                    onClick={() => setDetail(null)}
                    aria-label="關閉指標詳情"
                  >
                    <X size={21} />
                  </button>
                </div>
                <div className="detail-value">
                  {formatValue(detail, o?.value)} <small>{m.unit}</small>
                </div>
                {m.sentimentIndex && <SentimentGauge observation={o} />}
                <div className="detail-comparisons">
                  <div>
                    <span>最新觀測</span>
                    <strong>{o?.date ?? "缺值"}</strong>
                  </div>
                  <div>
                    <span>
                      {o?.sentiment?.previousClose !== undefined
                        ? "CNN 前收基準"
                        : m.quoteSymbol
                          ? "前一日保存快照"
                          : "前一交易觀測"}
                    </span>
                    <strong>
                      {o?.sentiment?.previousClose !== undefined
                        ? formatValue(detail, o.sentiment.previousClose)
                        : (s.previous?.date ?? "缺值")}
                    </strong>
                    <small>
                      {o?.sentiment?.previousClose !== undefined
                        ? "基準日期未提供"
                        : formatValue(detail, s.previous?.value)}
                    </small>
                  </div>
                  <div>
                    <span>
                      {o?.sentiment?.previousClose !== undefined
                        ? "較 CNN 前收基準"
                        : m.quoteSymbol
                          ? (m.quoteChangeLabel ?? "Google 1D（來源基準）")
                          : "1 日變化"}
                    </span>
                    <strong>{formatChange(detail, s.change)}</strong>
                  </div>
                  <div>
                    <span>5 日變化</span>
                    <strong>{formatChange(detail, s.five)}</strong>
                  </div>
                </div>
                <TrendPanel
                  data={data}
                  date={date}
                  days={days}
                  setDays={setDays}
                  selected={detail}
                  setSelected={setDetail}
                />
                <div className="detail-source">
                  <h3>資料來源與時間</h3>
                  {s.expected && (
                    <p className={s.stale ? "warn" : "positive"}>
                      應到收盤日 {s.expected} · 目前 {o?.date ?? "缺值"} ·{" "}
                      {s.stale
                        ? `落後 ${s.lag} 交易日`
                        : s.valid
                          ? "已到齊"
                          : "尚未到齊"}
                    </p>
                  )}
                  <a
                    href={o?.source.url ?? m.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {o?.source.name ?? m.source.name} <ExternalLink size={14} />
                  </a>
                  <dl>
                    <dt>資料狀態</dt>
                    <dd>
                      {s.stale ? "落後／逾期" : s.valid ? "有來源數值" : "缺值"}{" "}
                      ·{" "}
                      {o?.method === "reviewed-import"
                        ? "人工核對匯入"
                        : o?.method === "market-data-api"
                          ? o?.quote
                            ? "行情報價快照"
                            : "行情來源日線"
                          : "官方端點"}
                    </dd>
                    <dt>觀測時區</dt>
                    <dd>{o?.timezone ?? "未提供"}</dd>
                    {o?.sentiment && (
                      <>
                        <dt>CNN 情緒分類</dt>
                        <dd>{sentimentRating(o.sentiment.rating).label}</dd>
                        <dt>原始指數分數</dt>
                        <dd>{o.value?.toFixed(4)}／100（卡片四捨五入）</dd>
                        {o.sentiment.updatedAt && (
                          <>
                            <dt>CNN 更新時間</dt>
                            <dd>{fmtTime(o.sentiment.updatedAt)}（台灣）</dd>
                          </>
                        )}
                      </>
                    )}
                    {o?.quote && (
                      <>
                        <dt>來源報價時間</dt>
                        <dd>{fmtTime(o.quote.quotedAt)}（台灣）</dd>
                        <dt>{m.quoteProvider ?? "Google"} 漲跌比較基準</dt>
                        <dd>
                          {formatValue(detail, o.quote.referencePrice)} {m.unit}
                          ；非前一日保存快照
                        </dd>
                        <dt>來源漲跌金額</dt>
                        <dd>
                          {o.quote.change.toFixed(m.changePrecision ?? 2)}{" "}
                          {m.unit}
                        </dd>
                      </>
                    )}
                    <dt>擷取時間</dt>
                    <dd>{fmtTime(o?.retrievedAt)}</dd>
                    <dt>發布時間</dt>
                    <dd>{fmtTime(o?.publishedAt)}</dd>
                    <dt>版本時間</dt>
                    <dd>{fmtTime(o?.vintage)}</dd>
                    {o?.period && (
                      <>
                        <dt>財報期間</dt>
                        <dd>{o.period}</dd>
                      </>
                    )}
                    {o?.meetingDate && (
                      <>
                        <dt>FOMC 會議</dt>
                        <dd>{o.meetingDate}</dd>
                      </>
                    )}
                  </dl>
                  <p>
                    {m.note ??
                      o?.reason ??
                      "未接通的資料請依 README 核對匯入。"}
                  </p>
                  {o?.evidence && <p>核對依據：{o.evidence}</p>}
                  {m.reference && (
                    <p className="panel-note">
                      Google 提供的是期貨參考，與本卡現貨分開：{" "}
                      <a
                        className="source-link"
                        href={m.reference.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.reference.name} <ExternalLink size={13} />
                      </a>
                    </p>
                  )}
                  <p className="panel-note">
                    歷史回補反映目前來源版本；發布時間未知時不假設為觀測當天。不是當時可得資訊回測。
                  </p>
                </div>
              </>
            );
          })()}
      </dialog>
    </div>
  );
}
