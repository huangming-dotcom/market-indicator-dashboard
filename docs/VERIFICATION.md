# 驗收紀錄｜2026-11-21

## 自動驗收

- Node.js 24.18.0，Windows PowerShell。
- `npm test`：3 個測試檔，27 項全部通過。
- `npm run data:validate`：1,362 筆觀測、schema v1 通過。
- `npm run build`：TypeScript 與正式建置通過。
- `npm audit --omit=dev`：0 個已知弱點；安裝完整依賴時亦為 0。
- 實際每日更新 `--start 2026-06-01 --end 2026-11-21 --strict`：11 個來源工作全部成功；先前一次 Treasury 解析錯誤有保留在 run 歷史，修正後成功，不清除紀錄。

## 計算與管線覆蓋

前一交易觀測、週末、不跨缺值算單日變化、bp／pp／百分比、零分母、六筆觀測才計算五日變化、不同 Fed 會議、已知發布時間防前視、來源修訂 vintage、逾期排除、同日廣度、20 筆均量、最低風險覆蓋及跨市場時間落差、異常門檻、schema 日期／單位／未來資料／FedWatch 完整性、人工證據、Treasury 型別 XML、FRED CSV 空白、TWSE 單位與日期、欄位變動、部分來源失敗保留歷史、冪等與執行鎖。

## 實際瀏覽器驗收

- 1440×1000 桌面：市場總覽、KPI、來源日期與缺值標記可讀；各分頁與詳情正常。
- 390×844 手機：側欄可開關並切換總經頁；美債圖與比較表可操作；頁面寬度 375px（扣除捲軸），沒有整頁水平溢出。
- 指標詳情：10Y 顯示前一觀測日期；可切換 WTI 及 90 日趨勢。
- 資料品質：搜尋 Fed 可找到三項缺值與 CME 官方連結。
- 日期欄位：發現瀏覽器 input 事件與 change 行為差異，已補齊 input 處理並加入回歸測試；切到 2026-11-18 確認 KPI、異常及 Regime 同步更新。
- 截圖交付：outputs 內的 dashboard-desktop.jpg、dashboard-mobile.jpg。

## 已知限制

- 尚未接通的來源清單以 README 為準；AI 與 FedWatch 保留缺值。沒有把測試資料放進網站。
- Vite 對約 818KB 未壓縮主 JS 產生大分塊提示，gzip 約 238KB；不影響建置。後續資料規模增加時可再拆分圖表頁與資料 API。
- GitHub 發布更新：新增 main 推送部署與每日資料更新後部署，採 GitHub Pages Actions 模式；Windows 本機工作排程器未註冊。
- 日資料存在發布延遲，不作即時行情或 point-in-time 回測用途。

## GitHub Pages 部署驗收

- Vite 設定相對資產路徑，同時支援根目錄與儲存庫子目錄。
- 新增 `npm run test:build`：以 `/market-indicator-dashboard/` 子目錄實際提供正式建置，檢查 HTML、JavaScript、CSS 與 history.json HTTP 回應，並驗證資料契約。
- 管線整合測試固定測試日期，避免 CI 執行日期影響合成資料的未來日期限制。
