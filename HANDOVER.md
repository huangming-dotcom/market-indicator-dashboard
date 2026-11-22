# 當前交接快照

日期：2026-11-22（Asia/Taipei）

- 本次完成：USD/TWD 改接 Yahoo TWD=X 已結束來源日線；總覽預設加入 WTI 與布蘭特現貨，舊版版面一次補入且保留其他設定；顯示排定更新時段及已發布快照；Google 原油期貨以獨立參考連結呈現，不替換現貨。
- 資料：3767 筆觀測、12 筆政策補充（以 public/data/history.json 為準）；Yahoo FX 最新 11/20，EIA／FRED 兩種現貨最新均 11/17，與官方原始表核對一致。未採用 Google 期貨充當現貨。
- 驗收：54 項測試、資料驗證、正式建置及 Pages 子目錄檢查通過；本次瀏覽工具恢復，完成桌面原油卡片／詳情及手機自訂版面、無水平溢出檢查。最新驗收見 [VERIFICATION](docs/VERIFICATION.md)。
- 既有功能：全球指數（含 SOX／KOSPI／Nikkei）、台股官方補源、交易日品質、自訂卡片、FOMC／Reuters 補充；AI 介面已移除。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程，部分來源成功仍發布。11/22 08:21 查核 workflow 啟用中但尚無 schedule 事件紀錄，不能宣稱今早排程已執行。另已[手動完整更新及部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44966586175)成功：23／24 來源工作成功，包含 Yahoo FX；唯一待配置 CME 精確快照。線上確認快照時間 08:27:17。GitHub 排程可能延後或跳過，請以實際快照／Actions 為準。
- 限制：CME 精確機率仍需官方完整快照／授權轉接；TAIFEX 初始一日前值待累積；交易日曆覆蓋 2025–2027；原油現貨依發布頻率。Regime 版本 regime-v3-fx，跨 Yahoo／H.10 匯率口徑不計差值。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作與來源範圍、[資料契約](docs/DATA_CONTRACT.md) 接入說明，src 為機器定義。非收工，本次未更動 Evernote。
