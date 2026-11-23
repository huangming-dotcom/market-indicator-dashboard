# 當前交接快照

日期：2026-11-23（Asia/Taipei）

- 本次完成：「每日市場摘要」頁簽與直接入口 #daily-summary；原文、Markdown 表格、Recharts 線圖／長條圖、歷史日期、缺當日提示、來源／匯入時間、修訂封存與獨立錯誤重試。
- 資料：3961 筆行情觀測（以 public/data/history.json 為準，本次未修改行情）；獨立 public/reports/daily-market.json 封存 11/22、11/23 共 2 份完整每日雷達。原文不是已逐項核實行情，不參與指標或風險計算。
- 同步：已建立 Codex「同步每日市場摘要至網站」本對話排程，每天台灣 09:15／18:15；需本機可執行與來源對話可讀，不保證離線同步。唯一完整契約與操作：[每日摘要](docs/DAILY_SUMMARY.md)。
- 口徑：分類採 CNN rating，前收採 current.previous_close，不以歷史前值替代或猜測基準日期；不混用加密貨幣指數，不加入既有六項 Regime。
- 驗收：85 項測試、雙 schema、TypeScript／Vite 與正式 Pages 子目錄檢查；桌面圖表與明細表、歷史日期及 390px 手機版無水平溢出。最新發布結果見 [VERIFICATION](docs/VERIFICATION.md)。
- 既有：Yahoo 匯率主報價／獨立日線、Google 原油期貨／EIA 現貨、全球股指與台股官方資料、自訂卡片、FOMC／Reuters、來源品質；CME 精確機率待官方完整快照／授權，日曆覆蓋 2025–2027。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程可能延後或跳過，以實際 Actions／快照為準；部分來源成功仍發布。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作及來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，未更動 Evernote。
