# 當前交接快照

日期：2026-11-22（Asia/Taipei）

- 本次完成：美元／新台幣卡片切換 Yahoo 主報價（usdtwdQuote），與歷史日線（usdtwd）分開；舊版版面修訂 3→4 自動換卡且保留排序、顯示、風格及寬度。
- 資料：3771 筆觀測、12 筆政策，以 public/data/history.json 為準。主報價 32.958、來源漲跌 +0.0110／+0.0334%（顯示 +0.03%），來源時間台灣 11/21 06:36:29；日線 33.0263 保留供趨勢，不混成主報價。
- 驗收：69 項測試、schema、TypeScript／Vite 建置、Pages 子目錄檢查通過；實際資料擷取成功。驗收結果以 [VERIFICATION](docs/VERIFICATION.md) 為準。
- 雲端及線上：[完整資料更新及發布](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44969680585)成功，Yahoo 主報價 provider 成功。線上快照台灣 09:05:55，桌面卡片／詳情與 390px 手機寬度均已檢查。
- 規則：Regime v4-fx-quote 使用主報價同源漲跌。缺歷史主報價時不拿日線代替，部分歷史覆蓋會減少。主報價五日變化保留缺值；圖表明確標示採獨立日線。
- 既有：Google WTI／Brent 期貨獨立卡片、現貨、全球股指、台股官方資料、FOMC／Reuters、自訂版面與時效；AI 介面已移除。CME 精確機率待官方完整快照／授權，日曆覆蓋 2025–2027。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。每日台灣 07:00／09:00／17:30／22:30 排程，可能延後或跳過，以實際快照／Actions 為準；部分來源失敗仍發布其餘有效資料。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 使用及來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，本次未更動 Evernote。
