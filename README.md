# Market Indicator Agent Dashboard｜市場指標雷達

React + Vite + TypeScript + Tailwind CSS + Recharts。繁體中文、桌面與手機版、可追溯的日資料研究工作台。

## 立即使用

需要 Node.js 22.12 以上（交付時使用 24.18）與 npm。在本目錄開啟終端機：

```sh
npm ci
npm run dev
```

開啟終端機列出的網址（預設 `http://127.0.0.1:5173`）。交付附有已抓取的官方歷史資料，首次啟動不需要 API 金鑰。請勿直接雙擊 index.html；資料載入需要 HTTP 服務。

```sh
npm test                 # 計算、格式、管線與互動測試
npm run data:validate    # 檢查完整歷史資料
npm run build           # TypeScript 檢查與正式打包
npm run preview         # 預覽 dist 正式成品
```

## 畫面操作

1. **選擇日期**：右上日期是「截至當日」的日資料視圖。各市場保留自己的最近觀測日；假日不製造資料。卡片同時顯示最新與前值日期，避免將來源延遲誤認為今日行情。
2. **比較 KPI**：日變化依同一序列的前一筆交易觀測計算。利率採 bp，機率與比率差採 pp，價格採百分比，法人與期貨部位採原單位差。金融市場未同步，並非同時點橫向比較。
3. **點選指標**：開啟詳情，查看前一觀測、1／5 日變化、7／30／90 曆日趨勢、來源、觀測時區、發布／擷取／版本時間。
4. **切換左側分頁**：總經、全球、台股、AI 基本面、風險歷史、來源品質。來源頁可搜尋與篩選缺值／逾期。
5. **匯出快照**：下載當前選定日期的 JSON，包含數據、比較、規則版本與異常。重新載入按鈕只取得已發布的 history.json；不會在瀏覽器執行資料蒐集。

灰色「—」代表未知，**不是零**。逾期值可供參考但不參與風險判定。市場上漲用綠色、下跌用珊瑚紅；「風險改善／惡化」另依指標方向標示。美債、原油及融資等沒有單向利多解讀，顯示「需綜合判讀」。

## 已完成的資料連線

| 指標                   | 來源與口徑                                                                                                                             | 初始歷史範圍                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 2Y／10Y／30Y           | [美國財政部 Par Yield XML](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed)                                            | 自 2026-06-01，依來源可用日期           |
| USD/TWD                | [FRED DEXTAUS](https://fred.stlouisfed.org/series/DEXTAUS)，Fed H.10 美國午間買入匯率                                                  | 同上；非台北收盤匯率                    |
| WTI／Brent             | [DCOILWTICO](https://fred.stlouisfed.org/series/DCOILWTICO)、[DCOILBRENTEU](https://fred.stlouisfed.org/series/DCOILBRENTEU)，EIA 現貨 | 同上；非期貨結算價                      |
| S&P 500／NASDAQ        | FRED SP500／NASDAQCOM，保留原始發布機構口徑                                                                                            | 同上；來源可能延遲                      |
| 加權、成交股數與金額   | TWSE FMTQIK 月報                                                                                                                       | 同上                                    |
| 上市外資／投信／自營商 | TWSE BFI82U；自營商合併自行與避險，外資不含外資自營商                                                                                  | 初始化最近 6 個台股交易日               |
| 上市漲跌家數           | TWSE MI_INDEX「股票」欄；不混用整體證券欄                                                                                              | 初始化最近 6 個交易日                   |
| 上市融資               | TWSE MI_MARGN 融資金額，仟元轉億元                                                                                                     | 初始化最近 6 個交易日；今日餘額可能更帳 |
| 櫃買指數               | TPEX tpex_index 官方 OpenAPI                                                                                                           | 來源回傳當月；每日累積                  |

**未連線而明確缺值的項目**：CME FedWatch、SOX、KOSPI、台指期外資淨部位、上櫃法人／融資／廣度、台積電月營收與 AI 企業財報／Guidance。這些模組、欄位與比較功能已完成，可透過核對匯入接上；不宣稱已取得授權行情。FedWatch 需要完整會議快照，不以第三方新聞百分比替代。網站及文件沒有使用原對話中的示範行情。

初始資料快照截至 **2026-11-21（台灣時間）**，實際可用日以每個指標標記為準。請先看來源頁更新紀錄。原始 HTTP 回應與 SHA-256 封存在 `data/raw/`，每次執行紀錄在 `data/runs/`；這些檔案留在本機／備份，不進入網站靜態公開資產。

## 每日更新

```sh
npm run data:update
npm run data:validate
npm test
npm run build
```

預設回抓最近 150 曆日，包含跨年美債與逐月 TWSE，以新版本追加來源修訂。也可指定：

```sh
npm run data:update -- --start 2026-06-01 --end 2026-11-21 --strict
```

不得指定未來日期。端點重試最多 3 次、每次逾時 20 秒。成功來源可更新；失敗來源保留原歷史並在 run 標記失敗。`--strict` 有任何失敗便回傳非零，讓自動部署停在驗收階段。完整 schema 驗證成功後才以暫存檔原子替換 history.json。檔案鎖防止同時更新；中斷後請先確認沒有更新程序，再移除 `.update.lock`。

### 自動執行與發布

- 附 `.github/workflows/daily-data.yml`：放到你自己的 GitHub repository、啟用 Actions 後，每日 **UTC 00:30＝台灣 08:30** 擷取、測試、建置、提交資料，保留原始封存 artifact。排程可能延後，畫面仍以資料觀測日為準。
- 該工作流不含網站服務商的部署密鑰。網站平台需設定「資料 commit 後重新建置／部署 dist」；否則線上版維持上次已發布快照。
- Windows 本機可使用 `scripts/daily-update.ps1`。若需要排程，在 Windows 工作排程器建立每日 08:30 工作，程式選 PowerShell，參數為 `-NoProfile -File "完整路徑\scripts\daily-update.ps1"`。需要電腦開機及網路。這是交付的排程設定方式，**本次未在你的電腦註冊常駐排程**。
- 不把更新金鑰放入 `VITE_*` 或前端 bundle。新增有授權的 provider 時從執行環境讀取秘密。

## 人工核對匯入

詳見 [資料契約與擴充](docs/DATA_CONTRACT.md)。複製 `docs/import.example.json`，填入官方來源、正確單位、觀測日、財報期間／會議日、發布與擷取時間、核對依據，再執行：

```sh
npm run data:import -- path/to/reviewed.json --reviewed
npm run data:validate
npm test
npm run build
```

`--reviewed` 表示操作者已逐筆核對數值；格式與官方網域檢查**無法自動證明人工填入的數值為真**。拒絕缺少證據、未知指標、錯誤單位、未來觀測、錯誤日期、殘缺 FedWatch 機率。事件 ID 衝突不覆寫，修訂請新增 ID。

## 計算與資料限制

- 權威 schema 是 `src/schema.mjs`，JSON Schema 匯出為 `docs/history.schema.json`。指標定義、單位、時效與異常門檻集中於 `src/catalog.mjs`。計算集中於 `src/analytics.ts`。
- Risk Regime 是 `regime-v1` 規則推論。方法在風險歷史頁可展開；至少 4／6 個有效輸入，跨市場日期落差不超過 3 日。未達門檻顯示資料不足，不能當成 Neutral。
- 趨勢的 7／30／90 日是**曆日視窗**；缺值及非交易日不連線。美債 5 日變化是第 6 筆交易觀測至最新的差，沒有 6 筆就不輸出。
- 20 日均量採上市全市場成交股數最近 20 筆交易觀測，**含當日**；不混用成交金額或上市櫃合計。廣度不含持平、未成交及無比價。
- AI 表的比較是**前期公告值**，不是前一交易日。Capex 不能混用不同期間、租賃口徑或年度指引。
- 來源未提供精確發布時間時保留 null。觀測日、發布時間與擷取時間不能互換；歷史回補可能包含修訂，歷史視圖明確標示為目前版本重算，**不具 point-in-time 回測保證**。
- 目前儲存是版本化 JSON。多年／多人服務可用同一觀測契約遷移 SQLite 或 PostgreSQL，詳見資料契約；前端讀取 API 結果即可。
- 本工具描述市場與資料品質，風險規則未經投資績效驗證。資料再發布應遵守來源授權，尤其指數與 CME 資料。

## 專案結構

```text
src/                   React、指標定義、資料驗證、分析邏輯、樣式
scripts/               官方來源解析、每日更新、驗證、人工核對匯入
public/data/history.json 前端讀取的版本化歷史資料
tests/                 合成測試資料（從不載入前端）
docs/                  資料契約、JSON Schema、匯入範本、驗收紀錄
data/raw/              原始回應封存（不納入 Git／網站）
data/runs/             每次更新紀錄（不納入 Git／網站）
.github/workflows/     GitHub Actions 每日更新及驗收
```

## 常見問題

**部分指標顯示缺值？** 該指標尚未接通、來源未發布、未有核對快照，或所選日期在歷史範圍之外。請到來源頁查看，切勿直接把「—」改成 0。

**網頁重新整理後仍是昨天資料？** 重新載入只讀已發布快照；執行資料更新後要重新 build／部署線上版。本機 dev 讀取最新檔案。

**為何有 6／6 輸入卻資料不足？** 跨市場觀測日期落差可能超過 3 日，例如匯率來源延遲。這個限制避免不同日期訊號強行合成。

**來源格式改了？** 更新紀錄會顯示失敗並保留舊資料。修改 `scripts/providers.mjs` 對應解析器，先新增來源回應 fixture 測試，確認單位與日期再恢復更新。
