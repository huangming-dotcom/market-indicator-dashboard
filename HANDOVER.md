# 當前交接快照

日期：2026-11-24（Asia/Taipei）

- 本次完成：修復每日更新被跨日 UI 測試誤擋；固定測試 Date，增加 11/23 有效／11/24 逾期案例，正式時效規則不變。94 項測試通過，完整補跑與 Pages 發布成功，詳見 [驗收](docs/VERIFICATION.md)。
- 資料：4063 筆行情觀測（台灣 11/24 08:01:50）、417 項 M 平方日曆（08:01:51），公開 JSON 與 Git 快照雜湊一致。2 日原文摘要未變；日曆契約：[總經日曆](docs/MACRO_CALENDAR.md)。
- 日曆更新：接入既有 GitHub 雲端四次排程；新增 workflow_dispatch 的 update_calendar 以單獨更新日曆，不需本機開啟。原每日摘要同步仍需本機，兩者不同。
- 同步：已建立 Codex「同步每日市場摘要至網站」本對話排程，每天台灣 09:15／18:15；需本機可執行與來源對話可讀，不保證離線同步。唯一完整契約與操作：[每日摘要](docs/DAILY_SUMMARY.md)。
- 口徑：分類採 CNN rating，前收採 current.previous_close，不以歷史前值替代或猜測基準日期；不混用加密貨幣指數，不加入既有六項 Regime。
- 驗收：94 項測試、三份獨立 schema、TypeScript／Vite 與正式 Pages 子目錄檢查通過；既有手機驗收與本次線上快照核對見 [VERIFICATION](docs/VERIFICATION.md)。
- 既有功能保留；本次來源待補：WTI Google 報價缺少／矛盾、CME 精確機率未配置、Reuters 補充原文核對失敗。有效資料仍發布，缺值／逾期不補估；交易日曆覆蓋 2025–2027。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程可能延後或跳過，以實際 Actions／快照為準；部分來源成功仍發布。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作及來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，未更動 Evernote。
