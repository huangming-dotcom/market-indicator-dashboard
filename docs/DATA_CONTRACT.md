# 歷史資料契約 v1

## 權威與時間語意

Runtime 驗證以 `src/schema.mjs` 為準。`docs/history.schema.json` 是結構的機器可讀輸出，跨欄位邏輯（機率合計、單位對照等）仍由 runtime 驗證。新增指標先更新 catalog，不得只在卡片寫死值。

根節點：`schemaVersion: 1`、`generatedAt`、`observations`、`events`、`runs`、`policy`。新增 policy 為相容擴充，舊檔預設空陣列。

| Observation 欄位  | 契約                                                              |
| ----------------- | ----------------------------------------------------------------- |
| metricId          | catalog 中的穩定識別碼                                            |
| date              | 當地交易／觀測日 YYYY-MM-DD；AI 可用財報期間結束日                |
| value             | 有限數字或 null；不可用空字串／0 代替缺值                         |
| status            | verified＝有來源數值；missing 必須 value:null 且 reason 非空      |
| source            | name、https URL；保留實際來源端點／公告連結                       |
| retrievedAt       | 真正擷取時間 ISO-8601，含時區                                     |
| publishedAt       | 精確發布時間，未知保留 null；人工匯入必填                         |
| unit              | 必須完全符合 catalog，金額先轉為億元／十億 USD 等統一單位         |
| market / timezone | 原市場／來源時區，不用瀏覽器所在時區推測                          |
| vintage           | 此數值版本進入資料集的時間；來源修訂追加版本                      |
| method            | official-api、market-data-api（Yahoo）或 reviewed-import          |
| sessionStatus     | 選填 close（已完成日線）或 snapshot（時間點快照）                 |
| rawHash           | 自動資料原始回應 SHA-256，指向 data/raw 封存                      |
| period            | AI 必填，例如 2026-10、FY2027-Q3；寫明 GAAP 或租賃口徑於 evidence |
| meetingDate       | FedWatch 必填；不同會議不計算機率日變化                           |
| evidence          | 人工核對依據，必須可重現欄位與來源期間                            |
| reason            | 缺值原因、來源更帳說明等                                          |

唯一版本鍵為 `(metricId, date, meetingDate?, vintage)`。相同數值與語意重跑不新增；不同數值或來源／期間／發布時間追加 vintage。畫面每日期選最新 vintage；保留舊版本供稽核，不代表 point-in-time 回測。

## 核對匯入

`docs/import.example.json` 是空白可執行容器。新增 observation 時需填滿上表必填欄位，`method` 使用 `reviewed-import`，不可複製測試 fixture 或對話示範數字。

FedWatch 同一觀測日、會議與 vintage，應一次匯入 `fedCut`、`fedHold`、`fedHike` 三筆。數值是百分點制 0–100（70 代表 70%，不是 0.7），允許最多 0.1pp 的合計捨入誤差。降息包含所有低於目前政策目標的情境，升息亦同。需要明確官方目前區間與會議快照；不跨會議相減。

企業 Guidance 以 `events` 保存：`id`、`company`、`period`、`title`、`detail`、`publishedAt`、`retrievedAt`、`source{name,url}`、`evidence`。數值型營收／EPS／毛利率／Capex 用 observations 保存，指引文字與範圍原文摘要另列 events，不把預估當已實現值。

標準來源網域由 importer 允許清單管控。加入新的可信來源需同步更新清單、資料口徑與解析測試。官方網域只是最低檢查，人工仍須核對該連結真的支持該數值。

## Provider 介面與擴充步驟

1. 在 catalog 定義新 metric：ID、繁體標籤、單位、群組、有效日數、變化單位、風險方向、異常門檻與官方來源。
2. 在 providers 增加 `async provider(start,end) => Observation[]`，HTTP 走 fetchArchived 保留來源時間／原始回應。不可把 HTTP 200 當內容有效，需檢查欄位、統計口徑及回傳日期。
3. 在 update 註冊來源，將部分失敗限制在該來源；schema 驗證失敗不得覆寫成功歷史。
4. 增加實際來源格式的 parser 測試，並測試假日、空值、千元／元／億元、日期不符、HTML 錯誤頁。
5. 前端從 catalog 讀取，若新增規則輸入需另升級 RULE_VERSION；既有 Regime 不應無聲改變方法。

每日 TWSE 三類詳情、TPEX 外資及股票廣度先抓最近 6 交易日；之後每日累積。TPEX 儀表板融資趨勢可回補其回傳範圍，原當月指數 API 作備援。TAIFEX 最新端點只有當日，前值缺少時不捏造。較長歷史須另外批次回補並遵守來源限制。

## 政策補充與 CME 正規化快照

policy 每筆包含 id、kind（fomc／fedwatch-commentary）、date、title、summary、source{name,url}、publishedAt（可 null）、retrievedAt、confidence（official／reported）；可另有 meetingDate、referenceUrl、approximate。政策文字不進入機率加總或風險數值計算。id 作穩定識別，同一文章重新擷取會更新該項；數值 observation 仍保留所有 vintage。每日雷達輸出可為 policy 陣列或 {policy: [...]}，應保留原始報導連結及發布時間。

本機匯入：npm run data:import -- path/to/reviewed.json --reviewed，可同時包含 observations、events、policy。數字仍須逐筆核對；官方網域不是內容正確的證明。

CME_FEDWATCH_SNAPSHOT_FILE 使用下列契約（示意全部為測試數字，不載入網站）：

```json
{
  "date": "2026-11-20",
  "meetingDate": "2026-12-09",
  "observedAt": "2026-11-20T22:00:00Z",
  "sourceUrl": "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool",
  "currentTargetUpperBp": 400,
  "scenarios": [
    { "targetUpperBp": 375, "probabilityPct": 10 },
    { "targetUpperBp": 400, "probabilityPct": 20 },
    { "targetUpperBp": 425, "probabilityPct": 70 }
  ]
}
```

targetUpperBp 是目標區間上緣（bp），probabilityPct 為 0–100。完整情境加總 100%，分類為低於／等於／高於目前區間的降／維持／升息三筆，同一會議同一 vintage。拒絕重複區間、未來快照、缺漏情境或文字百分比。CME_FEDWATCH_URL 也必須回傳此正規化格式且為官方 HTTPS 網域，選填 CME_API_TOKEN 只走伺服器端 Authorization header。**這是接入邊界，不是已完成 CME 付費原始 API 轉接**；未配置時顯示缺值及原因。

## 日行情時效與版面

catalog.dailyMarket 決定股票／台股結構日行情使用的 US、TW、JP、KR 日曆。預期日是選定日期以前且實際已收盤的最近 session；落後一個 session 即排除規則計算。US 時區／提早收盤由版本化日曆提供。美債、FX 與現貨油不套股票日曆。超出 2025–2027 覆蓋範圍回報未知；更新日曆及臨時休市需維護來源模型。單日與五日比較另檢查相距 1／5 個 session，避免漏抓交易日形成錯誤差值。

自訂版面是獨立 layout schema v1，保存於瀏覽器 localStorage（market-radar-layout-v1），不改市場數據。可匯入／匯出 JSON；只接受有效 active metric ID、唯一卡片、指定樣式與寬度。舊版儲存損壞時使用預設版面。

## 建議資料庫遷移

- `metric_definitions(id, unit, frequency, market, source_id, definition_version)`
- `observations(metric_id, observation_date, meeting_date, vintage, value, status, published_at, retrieved_at, period, evidence, raw_hash)`，複合唯一索引與檢查約束。
- `sources(id, name, url, license, timezone)`、`raw_artifacts(hash, path, retrieved_at, source_id)`
- `fundamental_events(id, company, period, title, detail, published_at, source_id)`
- `pipeline_runs(id, started_at, finished_at, status, providers_json)`
- 若要真正 point-in-time 研究，新增 `first_seen_at`、來源發布版本與 immutable daily snapshots。查詢同時限制 observation_date 與 available_at；不可只用 vintage 日期回推一份今天才取得的歷史表。

保留機器產生的 Regime 與來源數據分層：目前 Regime 是帶版本的純函式。需要稽核時可持久化 `regime_snapshots(as_of, calculated_at, rule_version, input_observation_keys, coverage, result)`，不覆寫歷史判斷。
