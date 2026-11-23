import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Search } from "lucide-react";
import {
  addDays,
  calendarDate,
  calendarEvents,
  calendarStale,
  CALENDAR_URL,
  eventRegion,
  validateCalendar,
} from "./calendar.mjs";
type Calendar = ReturnType<typeof validateCalendar>;
type Event = Calendar["events"][number];
const stamp = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
      })
    : "尚未成功同步";
const clock = (e: Event) =>
  e.allDay
    ? "全天／時刻未提供"
    : new Date(e.startAt!).toLocaleTimeString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
export default function CalendarPanel({
  date = calendarDate(),
  refreshKey = "",
  compact = false,
  onOpen,
}: {
  date?: string;
  refreshKey?: string;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const [data, setData] = useState<Calendar | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [start, setStart] = useState(date),
    [days, setDays] = useState(7),
    [query, setQuery] = useState(""),
    [region, setRegion] = useState("全部");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const r = await fetch(
          `${import.meta.env.BASE_URL}calendar/macromicro.json`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!r.ok) throw new Error(`日曆讀取失敗（${r.status}）`);
        const next = validateCalendar(await r.json());
        if (!controller.signal.aborted) setData(next);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error && e.message.startsWith("日曆讀取失敗")
              ? e.message
              : "無法載入日曆資料，請稍後重試",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [refreshKey, retry]);
  const activeStart = compact ? date : start,
    activeDays = compact ? 7 : days;
  const events: Event[] = data
    ? calendarEvents(
        data,
        activeStart,
        activeDays,
        compact ? {} : { query, region },
      )
    : [];
  const shown = compact
    ? events.filter((e) => e.status !== "CANCELLED").slice(0, 3)
    : events;
  const stale = data && calendarStale(data),
    failed = data?.status === "failed";
  const outside =
    data &&
    (activeStart < data.coverage.start ||
      addDays(activeStart, activeDays) > data.coverage.end);
  const groups = [...new Set(shown.map((e) => e.date))];
  return (
    <section
      className={`calendar-panel ${compact ? "calendar-compact" : ""}`}
      aria-label={compact ? "近期總經事件" : "總經事件日曆內容"}
    >
      <header className="calendar-heading">
        <div>
          <span className="eyebrow lime">MACRO ECONOMIC CALENDAR</span>
          <h2>
            <CalendarDays size={22} />{" "}
            {compact ? "近期總經事件" : "總經事件日曆"}
          </h2>
          <p>財經 M 平方整理 · 發布時間統一以台灣時間顯示</p>
        </div>
        {compact ? (
          <button className="text-button" onClick={onOpen}>
            查看完整日曆 →
          </button>
        ) : (
          <a
            className="button"
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} /> 原始 Google 日曆
          </a>
        )}
      </header>
      {!compact && (
        <>
          <div className="calendar-note">
            預定發布時間可能調整，以發布機構及來源最新公告為準。來源備註中的預期／前值屬
            M 平方整理，本頁不將它們當作官方公布值，也不參與風險計算。
          </div>
          <div className="calendar-filters">
            <label>
              起始日期
              <input
                type="date"
                aria-label="日曆起始日期"
                value={start}
                onChange={(e) => {
                  if (e.target.value) setStart(e.target.value);
                }}
              />
            </label>
            <div className="calendar-period" role="group" aria-label="日曆天數">
              {[7, 30, 90].map((n) => (
                <button
                  key={n}
                  aria-pressed={days === n}
                  className={days === n ? "active" : ""}
                  onClick={() => setDays(n)}
                >
                  {n} 天
                </button>
              ))}
            </div>
            <label>
              國家／地區
              <select
                aria-label="日曆國家地區"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {[
                  "全部",
                  "美國",
                  "台灣",
                  "中國",
                  "日本",
                  "歐洲",
                  "英國",
                  "其他",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="calendar-search">
              搜尋事件
              <div>
                <Search size={15} />
                <input
                  aria-label="搜尋總經事件"
                  placeholder="CPI、非農、FOMC、PMI…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </label>
            <button
              className="text-button"
              onClick={() => {
                setStart(calendarDate());
                setQuery("");
                setRegion("全部");
              }}
            >
              回到今天
            </button>
          </div>
        </>
      )}
      <div className="calendar-status">
        <span>
          {activeStart} ～ {addDays(activeStart, activeDays - 1)} ·{" "}
          {compact ? "未來 7 天" : "所選區間"} ·{" "}
          {data?.lastSuccessAt
            ? `${events.filter((e) => e.status !== "CANCELLED").length} 項行程`
            : "行程尚未載入"}
        </span>
        {data && <span>成功同步 {stamp(data.lastSuccessAt)}（台灣）</span>}
      </div>
      {(failed || stale) && (
        <div className="calendar-warning" role="status">
          {failed
            ? "本次來源更新未成功，保留上次成功日曆。"
            : "日曆超過 24 小時未成功同步。"}
          請開啟原始日曆核對最新時間。
        </div>
      )}
      {outside && (
        <div className="calendar-warning">
          所選區間超出已同步範圍（{data!.coverage.start} ～{" "}
          {addDays(data!.coverage.end, -1)}），部分日期尚未涵蓋。
        </div>
      )}
      {loading && !data && <p role="status">正在載入總經日曆…</p>}
      {error && (
        <div className="calendar-warning" role={compact ? "status" : "alert"}>
          {error}。{data ? "保留上次載入內容。" : ""}
          <button
            className="text-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            重試日曆
          </button>
        </div>
      )}
      {!loading && !error && !shown.length && (
        <div className="calendar-empty">
          {data?.lastSuccessAt
            ? "此區間／篩選條件尚無來源列出的事件；不代表沒有總經發布。"
            : "尚未取得可用日曆，請查看原始日曆。"}
        </div>
      )}
      <div className="calendar-agenda">
        {groups.map((day) => (
          <div className="calendar-day" key={day}>
            <h3>
              {day}{" "}
              <span>
                {new Date(day + "T12:00:00+08:00").toLocaleDateString("zh-TW", {
                  timeZone: "Asia/Taipei",
                  weekday: "long",
                })}
              </span>
            </h3>
            {shown
              .filter((e) => e.date === day)
              .map((e) => (
                <article
                  className={`calendar-event ${e.status === "CANCELLED" ? "cancelled" : ""}`}
                  key={e.id}
                >
                  <div className="calendar-time">
                    <strong>{clock(e)}</strong>
                    <span>
                      {e.status === "CANCELLED"
                        ? "已取消"
                        : e.status === "TENTATIVE"
                          ? "暫定"
                          : e.startAt && Date.parse(e.startAt) < Date.now()
                            ? "預定時間已過"
                            : "預定發布"}
                    </span>
                  </div>
                  <div className="calendar-event-body">
                    <div className="calendar-event-title">
                      <h4>{e.title}</h4>
                      <span className="badge muted">
                        {eventRegion(e.title)}
                      </span>
                    </div>
                    {e.allDay &&
                      e.endDate &&
                      e.endDate > addDays(e.date, 1) && (
                        <p className="muted">
                          全天行程至 {addDays(e.endDate, -1)}（含當日）
                        </p>
                      )}
                    {!compact && (
                      <>
                        <details>
                          <summary>來源備註與更新時間</summary>
                          <p className="calendar-description">
                            {e.description || "來源未提供備註"}
                          </p>
                          <small>
                            來源最後修改：{stamp(e.updatedAt)}
                            {!e.allDay && ` · 原始時區 ${e.sourceTimezone}`}
                          </small>
                        </details>
                        {e.chartUrl && (
                          <a href={e.chartUrl} target="_blank" rel="noreferrer">
                            M 平方相關圖表 ↗
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
          </div>
        ))}
      </div>
      <footer className="calendar-footer">
        <a href={CALENDAR_URL} target="_blank" rel="noreferrer">
          來源：財經 M 平方－全球財經日曆 ↗
        </a>
        {!compact && (
          <>
            <span>
              雲端每日台灣 07:00／09:00／17:30／22:30
              更新，排程可能延後；不需本機開啟。
            </span>
            <span>
              地區由事件標題分類；全天事件不推測公布時刻。時間已過不表示數據已公布。
            </span>
          </>
        )}
      </footer>
    </section>
  );
}
