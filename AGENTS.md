# 專案藍圖與慣例

- 技術固定 React + Vite + TypeScript + Tailwind CSS + Recharts，介面使用繁體中文。
- 數據權威是原始發布機構。不得將聊天內容、搜尋摘要、示範或測試數字加入 public/data。
- 指標口徑與門檻以 src/catalog.mjs 為單一來源；runtime schema 以 src/schema.mjs 為單一來源；計算集中於 src/analytics.ts。
- 未核實數值顯示缺值；不可默認 0、插值或沿用舊值冒充當日。逾期排除風險判讀。
- 比較必須保留各市場觀測日期；利率 bp、機率 pp、金額差與百分比不得混用。
- 日行情以版本化交易日曆判定應到收盤日，落後即排除規則；比較需連續交易觀測。社群日曆覆蓋範圍與臨時休市須維護，超出範圍回報未知。美債、FX、現貨油不套股票日曆。
- Yahoo 已完成日線作全球指數行情來源，FRED 備援不能覆蓋已取得的日線。官方台股資料優先。政策報導獨立於精確機率，禁止把近似描述轉為精確值。
- ACTIVE_METRICS 是目前介面目錄；舊 AI metric 保留 schema 相容但不顯示。版面偏好獨立存 localStorage，可匯出／匯入，不改資料。
- 歷史修訂追加 vintage，既有數據不得無聲覆寫。Regime 方法變更升級規則版本。
- 私密金鑰不進前端，raw 證據不放 public/。外部來源先驗證格式、日期與單位再入庫。
- 驗收：npm test、npm run data:validate、npm run build；資料管線更動需涵蓋部分失敗、冪等與資料保留測試。
- GitHub 公開程式碼位於 huangming-dotcom/market-indicator-dashboard；GitHub Pages 採相對資產路徑。更新與發布集中在 .github/workflows/daily-data.yml，避免每日資料提交後沒有重新部署。發布前另跑 npm run test:build。
- 專案進度僅在 HANDOVER.md 保存精簡快照；使用方式在 README，資料契約在 docs/DATA_CONTRACT.md，不複製多份權威定義。
- 使用者規則：Evernote 筆記可直接建立／修改／移動；刪除既有筆記或內容前須就該次具體操作取得確認。開工／收工依使用者提供的流程。
