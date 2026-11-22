# Market Indicator Agent Dashboard｜市場指標雷達

React + Vite + TypeScript + Tailwind CSS + Recharts，繁體中文市場日資料工作台。

- [公開網站](https://huangming-dotcom.github.io/market-indicator-dashboard/)
- [GitHub 程式碼](https://github.com/huangming-dotcom/market-indicator-dashboard)
- [資料更新與部署紀錄](https://github.com/huangming-dotcom/market-indicator-dashboard/actions/workflows/daily-data.yml)

## 本機執行

需要 Node.js 22.12 以上（驗收使用 24.18）及 npm：

```sh
npm ci
npm run dev
```

開啟終端機列出的網址，通常為 http://127.0.0.1:5173。附有真實來源的歷史快照；勿直接雙擊 index.html。

```sh
npm test
npm run data:validate
npm run build
npm run test:build
npm run preview
```

## 操作方式

1. 選擇右上日期，查看截至該日的資料。各指標保留原市場觀測日、前值日期及來源時間。
2. 點「自訂版面」選擇卡片、完整／精簡／趨勢樣式、單／雙欄寬度；用上下按鈕或拖曳排列。可改依漲跌幅或異常程度排序。設定自動保存在目前瀏覽器；跨裝置可匯出／匯入版面 JSON。
   WTI／布蘭特的現貨與 Google 期貨共四張卡片預設顯示在總覽。舊版儲存的版面會一次補入新卡片，保留其他排序／風格；之後自行隱藏不會再次強制開啟。
3. 點指標開啟詳情，查看日變化、5 日變化、7／30／90 曆日趨勢、實際來源及擷取／發布／版本時間。
4. 分頁包含總經、全球股市、台股、風險歷史、來源品質。AI 基本面已依需求移除；舊資料契約保留相容性。
5. 「匯出快照」下載目前日期的數據、政策補充、規則版本及提醒。重新載入只讀取網站已發布快照；資料蒐集在更新管線執行。

「—」是未知，不能視為零。日行情落後應到收盤日即標示落後，排除風險判讀；卡片顯示應到日期與落後交易日數。缺少中間交易日，不把跨日漲跌冒充單日變化。利率變化用 bp、機率差用 pp、價格用百分比、部位用原單位差。

## 資料來源與口徑

| 指標                    | 實際來源／定義                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| 2Y／10Y／30Y            | 美國財政部 Par Yield XML，5 日變化須有 6 筆觀測                                                 |
| USD/TWD                 | Yahoo Finance TWD=X 已結束來源日線，1 USD 對應 TWD；FRED DEXTAUS 保留歷史與備援，非台北收盤     |
| WTI／Brent              | FRED DCOILWTICO／DCOILBRENTEU，EIA 現貨，非期貨結算                                             |
| WTI／布蘭特期貨・Google | Google Finance CLW00:NYMEX／BZW00:NYMEX 最新／延遲報價快照；1D 依來源比較基準，非官方結算       |
| S&P 500／NASDAQ         | Yahoo Finance ^GSPC／^IXIC 已完成日線；FRED 作歷史與備援，不覆蓋已取得的 Yahoo 日線             |
| SOX／KOSPI／Nikkei 225  | Yahoo Finance ^SOX／^KS11／^N225，未調整價格指數收盤，非 ETF／期貨                              |
| 加權／量額              | TWSE FMTQIK 月報，逐月回補；20 日均量為上市成交股數含當日                                       |
| 上市法人／融資／廣度    | TWSE BFI82U／MI_MARGN／MI_INDEX；外資不含外資自營商；自營商合併自行與避險；融資仟元轉億元       |
| 外資台指期淨部位        | TAIFEX 官方 OpenAPI，TX 大台外資及陸資「多方未平倉－空方未平倉」，不含小台／微台，不是成交淨額  |
| 上櫃外資                | TPEX 歷史法人日報，外資及陸資不含自營商，元轉億元                                               |
| 上櫃融資／指數          | TWSE 儀表板使用的 TPEX dashboardOtc/marginTrend 官方端點；marginBalance 已為億元                |
| 上櫃廣度                | TPEX 上櫃股票日行情，四位數股票代碼且漲跌為數值；排除 ETF、權證、除權息等無比價，與上市統計分開 |
| FOMC                    | 聯準會官方 monetary RSS，公告及會議紀錄連結、發布時間                                           |
| FedWatch 補充           | 已核對的 Reuters 轉載或每日雷達政策 feed；獨立顯示定性描述，不填精確機率                        |

每筆資料保留實際網址及時間。初始回補約 150 曆日；上市法人／融資／廣度、上櫃外資／廣度先抓最近 6 個交易日；上櫃融資端點目前回傳約 40 日。TAIFEX 最新端點先建立 1 日，前值需後續每日累積或核對匯入。沒有前值時保留缺值。

Yahoo 公開端點不是服務保證，可能限流或改版。解析驗證代碼、時區、價格範圍與已收盤狀態；失敗保留歷史並標示品質。所有資料再發布須遵守原來源條款。

USD/TWD 以 Yahoo Europe/London 來源日期為準，只匯入已跨入下一來源日的週一至週五日線，保留 4 位小數（卡片顯示 3 位），不以 regularMarketPrice 盤中報價冒充收盤。Yahoo 日線與 Fed H.10 午間定價是不同口徑，跨來源方法的匯率比較顯示缺值。

Google Finance 的 [WTI CLW00](https://www.google.com/finance/quote/CLW00:NYMEX) 與 [Brent BZW00](https://www.google.com/finance/quote/BZW00:NYMEX) 已新增為獨立報價卡，隨既有每日四次排程擷取。卡片顯示價格、Google 1D 百分比、來源基準及台灣時間的報價時間；點卡片可看來源連結與擷取時間。這是最新／延遲期貨快照，非保證即時或官方結算，不寫入現貨序列。沒有匯入完整期貨歷史，趨勢從首次擷取日起逐日累積，5 日變化保留缺值；1D 不以兩次擷取相減。Google 頁面無穩定公開 API 保證，格式／限流／同意頁失敗會保留歷史並顯示品質。

原油現貨仍使用 EIA／FRED；2026-11-22 核對 [EIA WTI](https://www.eia.gov/dnav/pet/hist/RWTCD.htm) 與 [EIA Brent](https://www.eia.gov/dnav/pet/hist/RBRTEd.htm) 兩者最新已發布觀測都為 11/17，不能用較新的期貨價格填成現貨。

### FedWatch 為何仍可能缺精確百分比？

CME 網頁透過動態嵌入工具載入；一般網頁回應沒有完整機率表。官方另有需訂閱的 FedWatch EOD API。本專案沒有取得該授權，也沒有把新聞「接近 100%」改成數字。現已另列 Reuters 定性補充與官方 FOMC 公告，並提供原工具連結。

精確百分比可透過完整官方快照匯入。CME_FEDWATCH_SNAPSHOT_FILE 指向符合[資料契約](docs/DATA_CONTRACT.md)的 JSON；也預留 CME_FEDWATCH_URL 與伺服器端 CME_API_TOKEN。這是**正規化資料介面**，並非已驗證能直接解析 CME 付費 API 原始格式；接入時須依授權回應完成轉換。必須一次包含同會議、同時間全部情境及目前政策利率區間。

每日雷達可先輸出核對後的 policy feed，設定 DAILY_RADAR_POLICY_URL（HTTPS），或本機 data/policy-reviewed.json。不會自動讀取 ChatGPT 排程對話，也不把其未核實數字入庫。人工匯入方式見資料契約。

## 每日更新與發布

```sh
npm run data:update
npm run data:update -- --start 2026-06-01 --end 2026-11-21 --strict
```

預設回抓 150 曆日；不可指定未來。HTTP 最多重試 3 次，每次逾時 20 秒。驗證後原子替換 JSON；修訂追加 vintage，不刪歷史。相同數值且僅查詢日期範圍改變不新增版本。更新鎖防止重複執行。

- GitHub Actions 在台灣時間 **07:00、09:00、17:30、22:30** 更新，涵蓋美股收盤、重試、亞洲收盤與台股信用資料；排程可能延後，並非即時行情保證。
- 頁面上方直接顯示排定時段與最近已發布快照時間。GitHub 排程可能因平台負載延後或跳過（[官方說明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)）；需以 Actions 實際執行及網站快照為準，不把排定時間視為已完成更新。
- 單一來源失敗會保留舊值，成功來源仍更新並發布；頁面顯示部分來源待補及落後日期。全部來源失敗、schema 或驗收失敗則不部署。
- --strict 適合診斷：任一來源失敗回傳非零；正常排程採部分成功發布，避免 CME 未配置阻擋其他市場。
- 推送 main 後自動驗證、測試與部署；手動更新在 Actions → Daily market data → Run workflow 勾選 update_data。
- 可選 GitHub Repository Variables：CME_FEDWATCH_URL、DAILY_RADAR_POLICY_URL；Secret：CME_API_TOKEN。本次未配置付費 API／金鑰。秘密不可使用 VITE_*。
- 原始 HTTP 回應／雜湊與執行紀錄在 data/raw、data/runs，Git 忽略；Actions 另保留 90 日 artifact，不放網站公開資產。
- Windows 可用 scripts/daily-update.ps1；未註冊本機常駐排程。正式自動更新由 GitHub 執行。

## 計算、時效與限制

- 定義以 src/catalog.mjs、schema 以 src/schema.mjs、計算以 src/analytics.ts 為單一來源；[JSON Schema](docs/history.schema.json)是匯出檔。
- 日行情採 US／TW／JP／KR 交易日曆（2025–2027，exchange_calendars 4.13.3），處理休市、夏令時間及提早收盤。日曆是社群模型；臨時休市須維護。超出覆蓋範圍顯示未知，不宣稱最新。開發者可在隔離 Python 環境安裝該版本後執行 scripts/generate-calendars.py；網站和更新不需 Python。
- 美債／匯率／現貨能源保留各自發布頻率及時效，不能套股票交易日曆，不能保證與股市同步。
- Risk Regime 版本 regime-v3-fx，納入交易日落後及匯率跨來源口徑判斷；至少 4／6 有效輸入且跨市場日期差不超過 3 日，否則資料不足。歷史使用目前資料版本重算，不保證 point-in-time 回測。
- 7／30／90 是曆日視窗；缺值不插補。廣度排除持平、未成交與無比價。
- 發布時間未知保留 null，擷取時間不等於發布時間。本工具的風險規則未經投資績效驗證。

## 擴充與交接

- [資料契約、精確機率及核對匯入](docs/DATA_CONTRACT.md)
- [驗收紀錄](docs/VERIFICATION.md)
- [專案藍圖](AGENTS.md)、[目前交接](HANDOVER.md)

```text
src/                     React、catalog、schema、分析及版面設定
src/data/                版本化交易日曆
scripts/                 來源解析、更新、驗證、人工匯入
public/data/history.json 網站版本化歷史資料
data/policy-sources.json  已核對的政策報導來源設定
tests/                   合成測試（不載入網站）
docs/                    資料契約、Schema、驗收
.github/workflows/       更新與 GitHub Pages 發布
```
