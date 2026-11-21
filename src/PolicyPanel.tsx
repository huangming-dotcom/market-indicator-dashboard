import { ExternalLink, Landmark, Info } from "lucide-react";
import type { Dataset } from "./types";
export default function PolicyPanel({
  data,
  date,
}: {
  data: Dataset;
  date: string;
}) {
  const rows = (data.policy ?? [])
    .filter(
      (item) =>
        item.date <= date &&
        (!item.publishedAt ||
          Date.parse(item.publishedAt) <= Date.parse(date + "T23:59:59+08:00")),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel policy-panel">
      <div className="panel-heading">
        <div>
          <h3>FOMC 與政策預期</h3>
          <p>官方公告與報導補充分列；文字描述不換算為精確機率</p>
        </div>
        <Landmark size={20} />
      </div>
      {rows.length ? (
        <div className="policy-grid">
          {rows.slice(0, 8).map((item) => (
            <article className="policy-item" key={item.id}>
              <div className="flex-between">
                <span
                  className={
                    "badge " + (item.confidence === "reported" ? "warn" : "")
                  }
                >
                  {item.confidence === "official"
                    ? "官方公告"
                    : "報導補充・非精確機率"}
                </span>
                <time>{item.date}</time>
              </div>
              <h4>{item.title}</h4>
              {item.meetingDate && (
                <p className="policy-meeting">目標會議 {item.meetingDate}</p>
              )}
              <p>{item.summary}</p>
              <p className="meta">
                發布：
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleString("zh-TW", {
                      timeZone: "Asia/Taipei",
                      hour12: false,
                    })
                  : "時間未提供"}{" "}
                · 擷取：
                {new Date(item.retrievedAt).toLocaleString("zh-TW", {
                  timeZone: "Asia/Taipei",
                  hour12: false,
                })}
                （台灣）
              </p>
              <a
                className="source-link"
                href={item.source.url}
                target="_blank"
                rel="noreferrer"
              >
                {item.source.name}
                <ExternalLink size={13} />
              </a>
              {item.referenceUrl && (
                <a
                  className="source-link"
                  href={item.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  每日雷達依據 <ExternalLink size={13} />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty small">
          <Info size={20} />
          所選日期尚無可核對的政策公告
        </div>
      )}
    </section>
  );
}
