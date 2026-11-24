# 當前交接快照

日期：2026-11-24（Asia/Taipei）

- 本次完成：每日摘要統一為 v2 匯入／閱讀格式，相容中英文標頭、多級及純文字續篇、缺 meta 圖表；保留來源數字、座標、單位、原文及原始 hash。完整規則：[每日摘要契約](docs/DAILY_SUMMARY.md)。
- 摘要：已封存 11/19～11/24 共 6 日；11/24 完整合併 4 段、7 張圖表，所有原文與訊息 ID／SHA-256 一致，重跑新增 0 筆。行情 4063 筆、日曆 417 項本次未變。
- 日曆更新：接入既有 GitHub 雲端四次排程；新增 workflow_dispatch 的 update_calendar 以單獨更新日曆，不需本機開啟。原每日摘要同步仍需本機，兩者不同。
- 同步：既有 Codex「同步每日市場摘要至網站」已更新為 v2 操作規則，維持台灣 09:15／18:15 與 ACTIVE；read_thread 單項上限修正為 20000。需本機可執行與來源對話可讀，不保證離線同步。
- 口徑：分類採 CNN rating，前收採 current.previous_close，不以歷史前值替代或猜測基準日期；不混用加密貨幣指數，不加入既有六項 Regime。
- 驗收：97 項測試、三份獨立 schema、TypeScript／Vite 與正式 Pages 子目錄檢查；桌面 7 張圖表／數值表、390px 手機無水平溢出。最新發布核對見 [VERIFICATION](docs/VERIFICATION.md)。
- 既有功能保留；本次來源待補：WTI Google 報價缺少／矛盾、CME 精確機率未配置、Reuters 補充原文核對失敗。有效資料仍發布，缺值／逾期不補估；交易日曆覆蓋 2025–2027。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程可能延後或跳過，以實際 Actions／快照為準；部分來源成功仍發布。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作及來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，未更動 Evernote。
