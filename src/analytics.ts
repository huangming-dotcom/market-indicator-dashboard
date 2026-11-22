import {
  CATALOG,
  ACTIVE_METRICS as METRICS,
  RULE_VERSION,
} from "./catalog.mjs";
import { expectedSession, sessionLag } from "./sessions.mjs";
import type { Dataset, Observation } from "./types";
export const dayDistance = (a: string, b: string) =>
  (Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000;
export const taipeiToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function history(data: Dataset, id: string, date: string) {
  const rows = data.observations.filter(
    (o) =>
      o.metricId === id &&
      o.date <= date &&
      (!o.publishedAt ||
        Date.parse(o.publishedAt) <= Date.parse(date + "T23:59:59+08:00")),
  );
  const byDate = new Map<string, Observation>();
  for (const o of rows) {
    const p = byDate.get(o.date);
    if (!p || o.vintage > p.vintage) byDate.set(o.date, o);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function snapshot(data: Dataset, id: string, date: string) {
  const rows = history(data, id, date);
  const current = rows.at(-1);
  const previous = rows.at(-2);
  const expected = expectedSession(CATALOG[id].dailyMarket, date);
  const lag = expected
    ? sessionLag(CATALOG[id].dailyMarket, current?.date, expected.date)
    : null;
  const calendarUnknown = !!CATALOG[id].dailyMarket && !expected;
  const stale =
    !!current &&
    (expected
      ? current.date < expected.date
      : dayDistance(date, current.date) > CATALOG[id].maxAge);
  // Do not skip missing observations: an outage must not become a multi-session "1D" move.
  const dailyMarket = CATALOG[id].dailyMarket;
  const completeGap = (other: Observation | undefined, sessions: number) =>
    !dailyMarket ||
    (!!other &&
      !!current &&
      sessionLag(dailyMarket, other.date, current.date) === sessions);
  const change = completeGap(previous, 1) ? delta(current, previous, id) : null;
  const five = completeGap(rows.at(-6), 5)
    ? delta(current, rows.at(-6), id)
    : null;
  return {
    current,
    previous,
    change,
    five,
    stale,
    expected: expected?.date ?? null,
    lag,
    calendarUnknown,
    rows,
    valid:
      current?.value !== null &&
      current?.value !== undefined &&
      !stale &&
      !calendarUnknown,
  };
}
export function delta(
  a: Observation | undefined,
  b: Observation | undefined,
  id: string,
): number | null {
  if (
    !a ||
    !b ||
    a.value === null ||
    b.value === null ||
    a.meetingDate !== b.meetingDate
  )
    return null;
  // Yahoo FX daily close and Fed H.10 noon fixing are different measurements.
  if (id === "usdtwd" && a.method !== b.method) return null;
  const mode = CATALOG[id].change;
  if (mode === "bp") return (a.value - b.value) * 100;
  if (mode === "pp" || mode === "absolute") return a.value - b.value;
  return b.value === 0 ? null : ((a.value - b.value) / Math.abs(b.value)) * 100;
}
export function formatValue(id: string, value: number | null | undefined) {
  return value == null
    ? "—"
    : new Intl.NumberFormat("zh-TW", {
        maximumFractionDigits: CATALOG[id].precision,
        minimumFractionDigits: CATALOG[id].precision,
      }).format(value);
}
export function changeUnit(id: string) {
  return CATALOG[id].change === "bp"
    ? "bp"
    : CATALOG[id].change === "pp"
      ? "pp"
      : CATALOG[id].change === "absolute"
        ? CATALOG[id].unit
        : "%";
}
export function formatChange(id: string, value: number | null) {
  return value === null
    ? "—"
    : `${value > 0 ? "+" : ""}${value.toFixed(CATALOG[id].change === "absolute" && CATALOG[id].precision === 0 ? 0 : 2)} ${changeUnit(id)}`;
}
export function riskDirection(
  id: string,
  change: number | null,
  stale = false,
) {
  if (change === null || stale) return { label: "無法判讀", tone: "muted" };
  if (CATALOG[id].direction === "context" || Math.abs(change) < 1e-8)
    return { label: "需綜合判讀", tone: "neutral" };
  const improved = CATALOG[id].direction === "up" ? change > 0 : change < 0;
  return {
    label: improved ? "風險改善" : "風險惡化",
    tone: improved ? "positive" : "negative",
  };
}
export function breadth(data: Dataset, date: string, otc = false) {
  const a = snapshot(data, otc ? "advancersOtc" : "advancers", date),
    b = snapshot(data, otc ? "declinersOtc" : "decliners", date);
  if (!a.valid || !b.valid || a.current!.date !== b.current!.date) return null;
  const total = a.current!.value! + b.current!.value!;
  return total === 0 ? null : (a.current!.value! / total) * 100;
}
export function volumeRatio(data: Dataset, date: string) {
  const s = snapshot(data, "volume", date);
  const rows = s.rows.slice(-20);
  if (!s.valid || rows.length !== 20 || rows.some((o) => o.value === null))
    return null;
  const avg = rows.reduce((n, o) => n + o.value!, 0) / 20;
  return avg
    ? { average: avg, ratio: s.current!.value! / avg, date: s.current!.date }
    : null;
}
export function regime(data: Dataset, date: string) {
  const inputs: { id: string; label: string; score: number; date: string }[] =
    [];
  for (const id of ["sp500", "nasdaq", "taiex", "usdtwd"]) {
    const s = snapshot(data, id, date);
    if (!s.valid || s.change === null) continue;
    const x = id === "usdtwd" ? -s.change : s.change;
    inputs.push({
      id,
      label: CATALOG[id].label,
      score: x > 0.3 ? 1 : x < -0.3 ? -1 : 0,
      date: s.current!.date,
    });
  }
  const br = breadth(data, date);
  if (br !== null)
    inputs.push({
      id: "breadth",
      label: "上市廣度",
      score: br > 60 ? 1 : br < 40 ? -1 : 0,
      date: snapshot(data, "advancers", date).current!.date,
    });
  const foreign = snapshot(data, "foreign", date);
  if (foreign.valid)
    inputs.push({
      id: "foreign",
      label: "上市外資",
      score:
        foreign.current!.value! > 50
          ? 1
          : foreign.current!.value! < -50
            ? -1
            : 0,
      date: foreign.current!.date,
    });
  const dates = inputs.map((x) => x.date);
  const span = dates.length
    ? Math.max(...dates.map((d) => dayDistance(date, d))) -
      Math.min(...dates.map((d) => dayDistance(date, d)))
    : 0;
  const sufficient = inputs.length >= 4 && span <= 3;
  const score = inputs.length
    ? inputs.reduce((n, x) => n + x.score, 0) / inputs.length
    : null;
  const label = !sufficient
    ? "資料不足"
    : score! >= 0.35
      ? "Risk-on"
      : score! <= -0.35
        ? "Risk-off"
        : "Neutral";
  return {
    label,
    score: sufficient ? score : null,
    coverage: inputs.length,
    total: 6,
    inputs,
    version: RULE_VERSION,
    reason:
      span > 3
        ? "跨市場觀測日期相差超過 3 日"
        : inputs.length < 4
          ? "至少需要 4／6 項有效輸入"
          : "依有效輸入等權計算；非投資建議",
  };
}
export function alerts(data: Dataset, date: string) {
  const items: {
    id: string;
    title: string;
    detail: string;
    kind: "market" | "quality";
  }[] = [];
  for (const m of METRICS) {
    const s = snapshot(data, m.id, date);
    if (s.stale)
      items.push({
        id: m.id,
        title: m.label + "・資料逾期",
        detail: s.expected
          ? `應到 ${s.expected}，目前 ${s.current!.date}，落後 ${s.lag} 個交易日`
          : `最後觀測 ${s.current!.date}，超過 ${m.maxAge} 日容許值`,
        kind: "quality",
      });
    if (
      s.valid &&
      m.threshold &&
      s.change !== null &&
      Math.abs(s.change) >= m.threshold
    )
      items.push({
        id: m.id,
        title: m.label + "・變動異常",
        detail: `${s.previous!.date} → ${s.current!.date}：${formatChange(m.id, s.change)}，門檻 ±${m.threshold} ${changeUnit(m.id)}`,
        kind: "market",
      });
  }
  const vol = volumeRatio(data, date);
  if (vol && (vol.ratio >= 1.5 || vol.ratio <= 0.7))
    items.push({
      id: "volume",
      title: "上市量能異常",
      detail: `成交股數為含當日 20 筆交易觀測均量的 ${vol.ratio.toFixed(2)} 倍`,
      kind: "market",
    });
  return items;
}
export function calendarDays(date: string, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}
