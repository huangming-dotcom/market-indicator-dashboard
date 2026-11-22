# 當前交接快照

日期：2026-11-22（Asia/Taipei）

- 本次完成：總覽新增 CNN Fear & Greed Index 卡片，含 0–100 分、繁體情緒分類／色帶、CNN 前收比較、觀測日及來源更新時間；詳情可看原始分數與歷史趨勢。版面修訂 4→5 一次補入，保留其他偏好。
- 資料：3876 筆觀測、12 筆政策（以 public/data/history.json 為準）；CNN 105 日歷史，最新紐約日期 11/20、原分數 9.67368421052632，顯示 10 分／極度恐懼；CNN 更新台灣 11/21 07:59:52。
- 口徑：分類採 CNN rating，前收採 current.previous_close，不以歷史前值替代或猜測基準日期；不混用加密貨幣指數，不加入既有六項 Regime。
- 驗收：78 項測試、schema、TypeScript／Vite 與正式 Pages 子目錄檢查通過，CNN provider 成功。詳見 [VERIFICATION](docs/VERIFICATION.md)。
- 既有：Yahoo 匯率主報價／獨立日線、Google 原油期貨／EIA 現貨、全球股指與台股官方資料、自訂卡片、FOMC／Reuters、來源品質；CME 精確機率待官方完整快照／授權，日曆覆蓋 2025–2027。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程可能延後或跳過，以實際 Actions／快照為準；部分來源成功仍發布。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作及來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，未更動 Evernote。
