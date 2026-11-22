# 當前交接快照

日期：2026-11-22（Asia/Taipei）

- 本次新增：Google Finance WTI（CLW00:NYMEX）與布蘭特（BZW00:NYMEX）獨立期貨報價卡，預設總覽可見；舊版版面修訂 2→3 一次加入新卡，保留現貨隱藏／排序／風格偏好。
- 資料：3769 筆觀測、12 筆政策（以 public/data/history.json 為準）。Google 最新／延遲期貨快照 WTI 83.62、Brent 92.56；報價時間台灣 11/21 06:50:31／06:50:27，來源日期為紐約 11/20；與 11/17 的 EIA 現貨分開。
- 口徑：Google 1D 採來源基準，非前一日保存快照差；保留 quotedAt、基準與擷取時間，非官方結算。期貨五日變化缺值，歷史自首次擷取累積，不加入 Regime 六項輸入。
- 驗收：62 項測試、schema、正式建置及 Pages 子目錄檢查通過；原始回應封存 raw。最新結果見 [VERIFICATION](docs/VERIFICATION.md)。
- 雲端與線上：兩個 Google provider 均成功，[完整更新及部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44968069916)完成；快照台灣 08:45:41、觀測仍 3769 筆。桌面／390px 手機卡片與詳情已檢查，無整頁水平溢出。
- 發布：[GitHub](https://github.com/huangming-dotcom/market-indicator-dashboard)／[網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)。沿用每日台灣 07:00／09:00／17:30／22:30 排程，Google 兩來源亦納入；部分來源成功仍發布。排程可能延後或跳過，實際時間以 Actions／快照為準。
- 既有：Yahoo USD/TWD、全球指數與台股官方資料、自訂版面、交易日時效、FOMC／Reuters；AI 介面已移除。CME 精確機率仍需完整官方快照／授權轉接，交易日曆覆蓋 2025–2027。
- 權威：[AGENTS](AGENTS.md) 架構、[README](README.md) 操作與來源、[資料契約](docs/DATA_CONTRACT.md) 接入，src 為機器定義。非收工，本次未更動 Evernote。
