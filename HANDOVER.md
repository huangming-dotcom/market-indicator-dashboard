# 當前交接快照

日期：2026-11-23（Asia/Taipei）

- 本次完成：「總經事件日曆」頁簽 #macro-calendar，整合使用者指定 M 平方公開 ICS；台灣發布時間、7／30／90 天、起始日期／地區／關鍵字、來源備註與連結；總覽近期 3 項事件及完整入口。
- 資料：public/calendar/macromicro.json 成功取得 413 項涵蓋事件（最近 90 日至未來 365 日），第三方預定行程不寫入行情／Regime；成功刷新反映改期及移除，失敗保留舊快照並標示。完整權威契約：[總經日曆](docs/MACRO_CALENDAR.md)。行情 3961 筆與 2 日原文摘要本次未修改。
- 日曆更新：接入既有 GitHub 雲端四次排程；新增 workflow_dispatch 的 update_calendar 以單獨更新日曆，不需本機開啟。原每日摘要同步仍需本機，兩者不同。
- 同步：已建立 Codex「同步每日市場摘要至網站」本對話排程，每天台灣 09:15／18:15；需本機可執行與來源對話可讀，不保證離線同步。唯一完整契約與操作：[每日摘要](docs/DAILY_SUMMARY.md)。
- 口徑：分類採 CNN rating，前收採 current.previous_close，不以歷史前值替代或猜測基準日期；不混用加密貨幣指數，不加入既有六項 Regime。
- 驗收：93 項測試、三份獨立 schema、TypeScript／Vite 與正式 Pages 子目錄檢查通過；全天日期跨三種主機時區、UTC 跨台北日、DST／重複／例外改期及失敗保留已測。390px 手機 clientWidth=scrollWidth=375；最新發布結果見 [VERIFICATION](docs/VERIFICATION.md)。
- 既有：Yahoo 匯率主報價／獨立日線、Google 原油期貨／EIA 現貨、全球股指與台股官方資料、自訂卡片、FOMC／Reuters、來源品質；CME 精確機率待官方完整快照／授權，日曆覆蓋 2025–2027。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程可能延後或跳過，以實際 Actions／快照為準；部分來源成功仍發布。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作及來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，未更動 Evernote。
