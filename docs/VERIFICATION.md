# 驗收紀錄

## 2026-11-24 每日更新中斷修復

- [失敗排程](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/45271515355)於測試階段中止，尚未提交／發布新快照；下載步驟已取得 4063 筆觀測、日曆 417 項。來源個別失敗仍以 partial 保存，阻擋整體發布的原因為 Google 期貨卡 UI 測試。
- 測試樣本固定 11/20，而 App 初始日期取真實台灣今日；11/24 起超過 3 日有效門檻，實際卡片正確顯示「逾期」，原斷言仍要求「報價快照」。本機 11/24 已先重現同一失敗。
- 修正僅在測試固定 Date 時鐘，不凍結 React 等待用 timeout／interval，不變更正式時效判斷。Google 卡參數化涵蓋台灣 11/23 有效／11/24 逾期，逾期仍「無法判讀」，來源價格與比較基準保留。
- 94 項測試、三份 schema、TypeScript／Vite 及正式 Pages 子目錄驗證通過。
- [完整補跑與發布](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/45293490545)成功，4063 筆行情觀測、417 項日曆；行情快照台灣 11/24 08:01:50，日曆 08:01:51。Pages 首次 artifact 尚未註冊，既有重試成功；短暫 CDN 傳播後，公開兩份 JSON HTTP 200 且內容雜湊與 Git 快照一致。
- 最新抓取仍為 partial：WTI Google 報價來源欄位缺少／矛盾、CME 精確機率未配置、Reuters 補充原文核對失敗；保留原缺值／逾期與來源狀態，不以放寬驗證或修改行情掩蓋。其餘來源及網站發布正常完成。

## 2026-11-23 M 平方總經日曆

- 指定 Google Calendar 的公開 ICS 回應 HTTP 200，名稱「財經 M 平方 - 全球財經日曆」。正規化 413 項涵蓋事件，範圍 2026-08-25 至 2027-11-24（排他）；來源原始證據在 ignored data/raw。
- 93 項測試、三份獨立資料驗證、TypeScript／Vite 及 Pages 子目錄日曆快照檢查通過。新增測試涵蓋 UTC 跨台北日、全天排他結束、UTC／台北／洛杉磯主機時區、折行／跳脫、DST／RRULE／EXDATE／RECURRENCE-ID、錯來源／截斷／floating 時刻拒絕、冪等／更新失敗保留及成功移除舊行程。
- 本機完整頁確認 7／30／90 日、國家地區、CPI 搜尋與來源連結；390×844 手機 clientWidth=scrollWidth=375，來源備註及時間可讀。總覽有近期事件入口。
- 雲端沿用台灣 07:00／09:00／17:30／22:30；單獨 update_calendar 可驗證日曆抓取而不修改行情。來源行程及預期／前值不回填行情，也不影響 Regime。
- [雲端日曆更新與部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/45137539593)成功；公開快照 HTTP 200、status=success，最後成功台灣 16:19:15，413 項事件、11/23 起 7 天有 13 項。線上日曆與本機總覽入口均已確認，截圖 outputs/macromicro-calendar-2026-11-23.jpg 位於專案外，不提交網站。

## 2026-11-23 每日市場摘要

- 85 項測試通過，3961 筆既有行情觀測驗證通過；新增摘要 schema、TypeScript／Vite 及 Pages 子目錄資產／摘要檔案驗證通過。
- 從指定來源對話完整訊息匯入 11/22（3 段）、11/23（1 段），共 2 日、2 個原文版本；每份保留日期、原文、訊息 ID、SHA-256 與匯入時間。未改動行情檔或 Regime。
- 封存測試涵蓋分段、錯來源／未來／不完整／錯誤圖表拒絕、缺值、冪等、修訂追加、失敗保留；UI 測試涵蓋日期切換、當日未同步、重載失敗重試、HTML／javascript 連結防護。
- 本機瀏覽器確認來源線圖正常重繪、可展開數值表，11/22／11/23 切換成功；390×844 手機重排後 clientWidth=scrollWidth=375，無頁面水平溢出，寬表格局部捲動。
- Codex 同步排程已建立且 ACTIVE（ID automation），台灣每日 09:15／18:15；需本機可執行及來源可讀。此為同步管線，不更動原摘要生成排程。
- [正式部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/45119313625)成功。線上 #daily-summary 可見 11/22、11/23 日期、完整 11/23 原文及原文封存標示；驗收截圖 outputs/daily-market-summary-2026-11-23.jpg 位於專案外，不提交網站。

## 2026-11-22 CNN Fear & Greed 卡片

- 78 項測試通過；3876 筆觀測、12 筆政策驗證通過，TypeScript／Vite／Pages 子目錄正式 HTTP 檢查通過。
- CNN 官方 graphdata 成功取得 105 個觀測日（2026-06-25 至 11-20）。最新原始分數 9.67368421052632、rating=extreme fear、更新時間 11/20 23:59:52 UTC；卡片顯示 10 分／極度恐懼，詳情保留精度。
- current.previous_close=18.6761904761905 與歷史前值不一致，變化採 CNN 來源前收基準且不填日期；測試明確涵蓋此差異。另涵蓋 UTC 午夜錨點、同日去重、0 與 null、範圍／分類／來源／未來時間、日期切換、修訂版本、版面遷移與 Regime 不納入。
- [雲端完整更新與部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/45023002261)成功：28 個來源工作，27 成功，CNN 擷取 105 筆成功；唯一待配置仍為 CME 精確快照。觀測 3876 筆、網站快照台灣 20:36:23。
- 真實線上桌面／390×844 手機可見 CNN 卡、10 分／極度恐懼、前收基準及更新時間；詳情 9.6737 原始精度、7／30／90 趨勢與 CNN 來源可讀。手機 clientWidth=scrollWidth=375。截圖 outputs/cnn-fear-greed-2026-11-22.jpg 為本次驗收，未納入 Git／網站。

## 2026-11-22 匯率主報價對齊

- 69 項測試通過；3770 筆觀測、12 筆政策驗證通過；TypeScript、Vite 及 Pages 子目錄正式 HTTP 檢查通過。
- 實際 Yahoo 主報價 32.958，來源時間 2026-11-20T22:36:29Z（台灣 11/21 06:36:29），同源漲跌 +0.0110、+0.0334%（卡片顯示 +0.03%），比較基準 32.947。不同的日線終值 33.0263 留在 usdtwd，沒有覆寫或刪除。
- 新 usdtwdQuote 採 regularMarketPrice／regularMarketTime，與歷史日線完全分列。主報價缺少時拒絕日線回填；測試涵蓋 chartPreviousClose 隨 range 變動不影響主報價基準、零漲跌、幣別／時間／來源漲跌不一致、兩序列計算分離、Regime 輸入及舊版版面修訂 3→4 保留偏好。
- Regime 版本升級 regime-v4-fx-quote；匯率改採主報價同源漲跌，歷史缺主報價時減少覆蓋，不拿日線當同口徑。詳情與迷你趨勢以獨立日線呈現，明確標示與主報價不同。
- [雲端完整更新及發布](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44969680585)成功；主報價 provider 成功。雲端觀測 3771 筆，快照時間台灣 09:05:55；唯一待配置的來源仍為 CME 精確快照。
- 線上瀏覽器確認卡片 32.958／+0.03%，來源時間台灣 11/21 06:36:29，詳情漲跌 0.0110、基準 32.947；圖表明確說明日線另列。390×844 手機 clientWidth=scrollWidth=375，無水平溢出。已保存線上截圖 outputs/yahoo-fx-main-quote-2026-11-22.jpg（不納入 Git／網站）。

## 2026-11-22 Google 期貨報價卡

- 62 項測試通過；3769 筆觀測及 12 筆政策補充驗證通過；TypeScript、Vite、Pages 子目錄 HTTP 檢查通過。
- 實際抓取兩個 Google 原頁，WTI 83.62（Google 1D +1.43%，基準 82.44），Brent 92.56（+0.63%，基準 91.98）；報價時間分別 2026-11-20T22:50:31Z／22:50:27Z。以上為實抓來源，測試合成值另存 tests，不載入網站。
- 新測試涵蓋錯誤商品／幣別／畫面價格、Unsupported 頁、未來時間、基準不一致、未執行外部腳本、schema、同價不同時間 vintage、舊版版面加入新期貨且保留已隱藏現貨、卡片與詳情的來源 1D 語意。
- 來源快照保留報價時間，不當現貨或官方結算；來源 1D 與保存的前一日快照分開，五日變化不補估。來源失敗仍保留舊值並可查品質。
- [雲端完整更新及部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44968069916)成功：26 個來源工作，25 成功，唯一待配置為 CME 精確快照；兩個 Google provider 均成功。快照台灣 08:45:41，觀測仍 3769 筆。
- 真實線上瀏覽器可見兩張 Google 卡，價格／來源 1D／比較基準／報價時間均正確。390×844 手機 clientWidth=scrollWidth=375，無水平溢出，詳情來源連結與基準可讀。另修正行情狀態文字為「行情網頁快照」，並通過 7 項 App 互動回歸測試及重建檢查。
- 線上桌面驗收截圖交付於 outputs/google-futures-cards-2026-11-22.jpg，不放網站或 Git。

## 2026-11-22 匯率、原油與更新時段

- 54 項測試通過；TypeScript／Vite、3767 筆資料驗證與正式 Pages 子目錄 HTTP 檢查通過。12 筆政策補充保留。
- 實際 Yahoo TWD=X 回應驗證 CURRENCY、TWD、Europe/London；11/20 日線 33.0263，非同頁盤中 regularMarketPrice。排除當日未結束及週末日線，跨 Yahoo／H.10 方法不算匯率漲跌。FRED 保留歷史備援。
- 原油與 EIA 原始表核對一致：WTI 89.53、Brent 92.94，日期均 11/17。Google CLW00／BZW00 頁面為期貨；沒有寫進現貨序列。
- 卡片預設與舊版設定遷移測試涵蓋兩張原油啟用、既有風格／排序保留、之後再次隱藏不重設。
- 真實瀏覽器檢查：桌面總覽兩張原油、Yahoo FX 來源與日期、WTI 詳情內期貨參考；390×844 手機可調整 WTI 風格／寬度並回總覽。DOM clientWidth=scrollWidth=375（扣除捲軸），無水平溢出。此輪瀏覽工具已恢復；下方 11/21 無法視覺驗收的紀錄仍作歷史保留。
- 線上桌面驗收截圖位於交付 outputs/dashboard-oil-fx-2026-11-22.jpg，未放入靜態網站或 Git。
- 11/22 08:21 實查 workflow 為 active，但無 schedule 事件紀錄；排定時間不可視為已執行，部署前另手動完整更新驗證。排程語法仍為 UTC 23:00／01:00／09:30／14:30，即台灣 07:00／09:00／17:30／22:30。
- [雲端完整更新及部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44966586175)成功，23／24 來源工作成功，包含 Yahoo USD/TWD 107 筆；唯一待配置為 CME 精確快照。觀測仍 3767 筆。線上瀏覽器按重新載入後確認最新快照台灣 08:27:17、兩張現貨卡及期貨參考分開呈現。

## 2026-11-21 改善版

## 自動驗收

- Node.js 24.18.0，Windows PowerShell。
- npm test：5 個檔案、48 項測試通過。
- npm run data:validate：3580 筆觀測，schema v1；另有 12 筆政策補充。
- npm run build：TypeScript 與 Vite 正式建置通過。
- npm run test:build：以 /market-indicator-dashboard/ 實際 HTTP 提供正式建置，HTML、JS、CSS 與 history.json 通過。
- npm audit --omit=dev：0 個已知弱點。主 JS 約 999KB／gzip 260KB，有大分塊提示，未阻擋建置。

## 本次資料管線實測

本機完整更新 23 個來源工作中 22 個成功，精確 CME 快照因未配置官方資料接入而明確失敗。整體 partial，成功來源正常發布；沒有使用測試或聊天示範數值。再次相同範圍更新後觀測仍 3580 筆，避免滾動查詢參數產生重複版本。

Yahoo 五個指數最新日 2026-11-20；期交所 TX 外資未平倉、TPEX 外資、融資與廣度成功。政策補充為 Fed 官方 RSS 11 筆及已核對 Reuters 轉載 1 筆。Reuters 只有定性描述，不生成精確機率。

## 回歸與新增覆蓋

- 既有 bp／pp／百分比、零分母、缺值、20 日均量、跨會議機率、來源修訂、schema／日期／單位驗證。
- 週末、感恩節、日本假日、美國夏令時間與提早收盤、台灣日期已跨日但美國仍盤中、超出日曆範圍。
- 落後一個交易日排除規則；中間漏抓不把兩日變化當單日；週末不阻斷有效前值比較。
- Yahoo 指數代碼／時區／高低價範圍、未收盤排除、null 保留；FRED 備援不覆蓋 Yahoo。
- TAIFEX 只取 TX 外資未平倉淨額，拒絕多空不平；TPEX 金額單位與指定日期、股票廣度範圍。
- 完整 CME 情境分類與 100% 合計、拒絕近似文字；Fed 官方 RSS 與未來公告篩選。
- 卡片顯示／樣式／寬度／排序保存及重新載入、版面 schema 無效輸入／重複 ID／損壞設定、AI 選單移除。
- 部分來源失敗保留歷史、鎖、冪等、原子寫入及正式部署子目錄。

## 視覺驗收限制

本次桌面瀏覽器與備援桌面工具啟動均回報 kernel assets 路徑不存在，無法執行新版真實瀏覽器桌面／手機視覺驗收。已完成 React DOM 互動測試及正式 HTTP 檢查，但不能等同實際視覺驗收。初版 desktop／mobile 截圖是歷史交付，不能作為這次自訂版面改版的證據。

## 部署

GitHub Actions 在 main 推送後執行驗證、測試、建置及 Pages 部署；來源原始證據另封存 90 日，部署登錄延遲時最多重試一次。實際發布與雲端擷取結果以 [Actions](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/workflows/daily-data.yml) 為準。

- [改善版首次部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44916640455)成功。
- [雲端完整資料更新及再次部署](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/runs/44916679456)成功；22／23 來源工作成功，唯一待配置為 CME 精確快照，未影響其他資料發布。資料生成時間 2026-11-21 22:59:29（台灣），觀測仍 3580 筆。
- 公開網站 HTML、兩個 JS／CSS 資產及 history.json 實際 HTTP 200；線上五個全球指數、TX 外資部位、上櫃外資及融資最新日均確認為 2026-11-20。
- Windows daily-update.ps1 與 GitHub 一致採部分來源成功發布，完成建置後另檢查正式網站子目錄。
