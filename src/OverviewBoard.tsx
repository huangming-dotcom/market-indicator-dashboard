import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Settings2,
  X,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import { CATALOG } from "./catalog.mjs";
import { snapshot } from "./analytics";
import {
  defaultLayout,
  LAYOUT_KEY,
  moveCard,
  parseLayout,
  readLayout,
  type Layout,
} from "./layout";
import type { Dataset } from "./types";

export default function OverviewBoard({
  data,
  date,
  renderCard,
}: {
  data: Dataset;
  date: string;
  renderCard: (id: string, style: string) => ReactNode;
}) {
  const [layout, setLayout] = useState<Layout>(readLayout),
    [editing, setEditing] = useState(false),
    [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      setMessage("瀏覽器無法儲存版面；可匯出設定備份。");
    }
  }, [layout]);
  useEffect(() => {
    if (editing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editing]);
  const patch = (id: string, p: Partial<Layout["cards"][number]>) =>
    setLayout((l) => ({
      ...l,
      cards: l.cards.map((c) => (c.id === id ? { ...c, ...p } : c)),
    }));
  const cards = layout.cards.filter((c) => c.visible);
  if (layout.sort !== "manual")
    cards.sort((a, b) => {
      const score = (id: string) => {
        const s = snapshot(data, id, date);
        if (!s.valid || s.change === null) return -Infinity;
        return layout.sort === "change"
          ? CATALOG[id].change === "percent"
            ? s.change
            : -Infinity
          : CATALOG[id].threshold
            ? Math.abs(s.change) / CATALOG[id].threshold
            : -Infinity;
      };
      return score(b.id) - score(a.id);
    });
  function exportLayout() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "market-radar-layout.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importLayout(selected: File | undefined) {
    if (!selected) return;
    try {
      if (selected.size > 100000) throw new Error("設定檔過大");
      setLayout(parseLayout(JSON.parse(await selected.text())));
      setMessage("已匯入版面設定。");
    } catch {
      setMessage("無法匯入：請選擇本儀表板匯出的有效版面 JSON。");
    } finally {
      if (file.current) file.current.value = "";
    }
  }
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">YOUR MARKET WORKSPACE</span>
          <h2>今日與前一交易觀測</h2>
        </div>
        <button className="button" onClick={() => setEditing(true)}>
          <Settings2 size={16} />
          自訂版面
        </button>
      </div>
      <div className="board-toolbar">
        <span className="meta">拖曳卡片排序；詳細比較與來源可點卡片查看</span>
        <label>
          排序{" "}
          <select
            aria-label="總覽排序方式"
            value={layout.sort}
            onChange={(e) =>
              setLayout((l) => ({
                ...l,
                sort: e.target.value as Layout["sort"],
              }))
            }
          >
            <option value="manual">我的排序</option>
            <option value="change">漲跌幅（百分比指標）</option>
            <option value="alerts">異常程度（相對門檻）</option>
          </select>
        </label>
      </div>
      <div className="metrics-grid custom-board" aria-label="自訂指標卡片">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`board-slot width-${card.width} style-${card.style}`}
            draggable={layout.sort === "manual"}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setLayout((l) =>
                moveCard(l, e.dataTransfer.getData("text/plain"), card.id),
              );
            }}
          >
            {renderCard(card.id, card.style)}
          </div>
        ))}
      </div>
      {!cards.length && (
        <div className="empty">目前未選擇卡片，請從「自訂版面」加入指標。</div>
      )}
      {cards.some((c) => ["wti", "brent"].includes(c.id)) && (
        <p className="panel-note oil-reference">
          EIA 現貨與 Google 期貨分開成卡；期貨為最新／延遲報價快照，1D
          依來源基準：{" "}
          <a href={CATALOG.wti.reference.url} target="_blank" rel="noreferrer">
            WTI 期貨
          </a>{" "}
          ·{" "}
          <a
            href={CATALOG.brent.reference.url}
            target="_blank"
            rel="noreferrer"
          >
            布蘭特期貨
          </a>
          。兩者不混算。
        </p>
      )}
      {message && (
        <p className="layout-message" role="status">
          {message}
        </p>
      )}
      <dialog
        ref={dialog}
        className="layout-dialog"
        aria-labelledby="layout-title"
        onCancel={() => setEditing(false)}
        onClose={() => setEditing(false)}
      >
        <div className="dialog-top">
          <div>
            <span className="eyebrow">PERSONALIZE</span>
            <h2 id="layout-title">自訂市場總覽</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setEditing(false)}
            aria-label="關閉版面設定"
          >
            <X size={20} />
          </button>
        </div>
        <p className="panel-note">
          設定自動儲存在此瀏覽器。電腦與手機可透過匯出／匯入同步版面；不需登入。
        </p>
        <div className="layout-actions">
          <button className="button" onClick={exportLayout}>
            <Download size={16} />
            匯出版面
          </button>
          <button className="button" onClick={() => file.current?.click()}>
            <Upload size={16} />
            匯入版面
          </button>
          <button
            className="button"
            onClick={() => {
              setLayout(defaultLayout());
              setMessage("已還原預設版面。");
            }}
          >
            <RotateCcw size={16} />
            還原預設
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => void importLayout(e.target.files?.[0])}
          />
        </div>
        <div className="layout-list">
          {layout.cards.map((card, index) => (
            <div className="layout-row" key={card.id}>
              <GripVertical size={16} className="muted" />
              <label>
                <input
                  type="checkbox"
                  checked={card.visible}
                  onChange={(e) =>
                    patch(card.id, { visible: e.target.checked })
                  }
                />
                {CATALOG[card.id].label}
              </label>
              <select
                aria-label={`${CATALOG[card.id].label}卡片風格`}
                value={card.style}
                onChange={(e) =>
                  patch(card.id, {
                    style: e.target.value as "full" | "compact" | "trend",
                  })
                }
              >
                <option value="full">完整比較</option>
                <option value="compact">緊湊數字</option>
                <option value="trend">迷你趨勢</option>
              </select>
              <select
                aria-label={`${CATALOG[card.id].label}卡片寬度`}
                value={card.width}
                onChange={(e) =>
                  patch(card.id, { width: Number(e.target.value) as 1 | 2 })
                }
              >
                <option value={1}>標準寬</option>
                <option value={2}>加寬</option>
              </select>
              <button
                className="icon-button"
                aria-label={`上移${CATALOG[card.id].label}`}
                disabled={index === 0}
                onClick={() =>
                  setLayout((l) => moveCard(l, card.id, l.cards[index - 1].id))
                }
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={`下移${CATALOG[card.id].label}`}
                disabled={index === layout.cards.length - 1}
                onClick={() =>
                  setLayout((l) => moveCard(l, card.id, l.cards[index + 1].id))
                }
              >
                <ArrowDown size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="layout-done">
          <button className="button" onClick={() => setEditing(false)}>
            完成設定
          </button>
        </div>
      </dialog>
    </>
  );
}
