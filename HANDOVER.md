# 當前交接快照

日期：2026-11-21（Asia/Taipei）

- 已完成：繁體中文 Dashboard、React／Vite／Tailwind／Recharts、各市場 KPI 比較、歷史日期與 7／30／90 日切換、來源品質與缺值、風險規則與歷史、AI 與 FedWatch 匯入介面、每日管線、測試、文件。
- 資料快照：1,362 筆官方來源歷史觀測；資料集最新觀測日 2026-11-20，各指標時間不同。原始回應位於 data/raw，本機更新紀錄位於 data/runs。
- 驗收：27 項測試通過、資料驗證通過、正式建置通過、桌面／手機人工瀏覽器檢查完成。詳見 [驗收紀錄](docs/VERIFICATION.md)。
- GitHub 交付：使用者已選擇公開程式碼與公開網站。儲存庫 [market-indicator-dashboard](https://github.com/huangming-dotcom/market-indicator-dashboard)，網站與部署操作以 README 為準；更新與發布集中在同一 Actions 工作流。
- 限制與下一步：尚未接通的 FedWatch、部分台股及 AI 財報保留缺值；依 [README](README.md) 的人工核對匯入與來源擴充流程接上。每日台灣 08:30 排程由 GitHub 執行；來源失敗則保留前次已發布版本。
- 權威來源：架構與慣例見 [AGENTS.md](AGENTS.md)；使用方式、現有連線與限制見 [README](README.md)；資料契約見 [DATA_CONTRACT](docs/DATA_CONTRACT.md)；schema 與計算以 src 定義為準。
- Evernote：本次未要求收工或寫入工作日誌，未更動既有筆記。詳細實作驗收記錄在本次交付文件；後續收工依使用者規則整合權威日誌。
