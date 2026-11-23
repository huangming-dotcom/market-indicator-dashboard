# 總經事件日曆

平台將使用者指定的公開「財經 M 平方 - 全球財經日曆」整合為原生事件列表，而不是需要登入的個人日曆。入口為主選單「總經事件日曆」或網站 `#macro-calendar`；市場總覽另列選定日期起 7 天內前 3 項未取消事件，可連至完整頁。

## 來源與口徑

- 唯一來源：使用者指定 Google Calendar ID `c_597b99efc6b2429fff1bf02863b61b7b08a176d17fb6ad0b1d6ba1f3fa3ac9c9@group.calendar.google.com`。固定公開 ICS feed 及原始 Google 日曆連結由 `src/calendar.mjs` 定義，不需要金鑰、登入或本機排程。
- 這是 M 平方整理的第三方發布行程，並非每個發布機構的官方即時公告。標題、備註及原始時間以來源為準。來源備註中的市場預期／前值保留為文字，不解析成已核實公布值，不回填 `history.json` 或影響 Regime。
- 有時刻的事件儲存 UTC ISO instant，日期與畫面時刻統一轉成 Asia/Taipei；保留原始時區。支援跨日、IANA 時區及美國 DST。未標明時區的 floating DTSTART 拒絕更新，不依執行主機猜測。
- 全天事件保留來源純日期，不當成真實 UTC instant、不推測發布時間；DTEND 採 iCalendar 排他結束日。node-ical 的 date-only Date 是本機午夜佔位，必須取其曆法年月日，不能用 UTC ISO 截日。已在 UTC／台北／洛杉磯主機時區分別驗證。
- RRULE 有界展開，處理 EXDATE 及 RECURRENCE-ID 改期，拒絕高頻規則；保留取消／暫定狀態。畫面「預定時間已過」只比較行程時間，不代表經濟數據已公布。
- 地區是依標題的簡單分類，沒有自行添加來源未提供的影響星等。來源原文顯示為純文字，圖表外連限 macromicro.me 的 HTTPS 網址。

## 資料與更新

- `src/calendar.mjs` 是常數、runtime schema、篩選與時效定義的唯一來源；抓取／正規化在 `scripts/calendar-update.mjs`；公開快照 `public/calendar/macromicro.json` 獨立於行情及報告封存。
- 下載整份公開 feed 後，儲存最近 90 日至未來 365 日（今天亦計入），coverage.end 為排他日期。超出範圍會提示，沒有列出事件不表示沒有總經發布。
- 每次完整成功抓取取代目前行程快照，以反映來源刪除、取消及改期，避免殘留舊時間。原始 ICS 及 SHA-256 證據存 `data/raw`，不進前端；雲端證據 artifact 保留 90 天。此處是可變更的預定行程，不是行情觀測的 vintage 歷史。
- 保留最後成功、最後嘗試時間、來源原始雜湊、來源事件數與涵蓋範圍。下載／格式驗證失敗時保留上次成功事件與時間，標示 failed；超過 24 小時未成功同步也會提示。單一日曆來源失敗不阻擋其他正常資料的網站發布。
- `.github/workflows/daily-data.yml` 沿用雲端排程：台灣 07:00／09:00／17:30／22:30，可能延後或跳過。排程及 `update_data=true` 會一起更新日曆；可另用 `workflow_dispatch update_calendar=true` 只更新日曆。一般程式碼 push 只驗證／發布目前快照。
- 行情與日曆快照會在相同工作流程提交及部署，不依賴 bot commit 再觸發另一工作流程。前端重新載入只取得已發布快照，不會直接呼叫 Google 或提早執行雲端抓取。

## 操作及驗證

```sh
npm run calendar:update
npm run calendar:validate
npm test
npm run build
npm run test:build
```

完整頁可選起始日期、7／30／90 天、國家地區與關鍵字，點「來源備註與更新時間」展開來源內容。保留原始 Google 日曆及相關 M 平方圖表連結。若來源停止公開，保留舊快照並提示待更新，不繞過登入限制。

`tests/calendar.test.ts` 驗證跨日、純日期／排他結束日、跨主機時區、折行／跳脫、DST／週期例外／改期、來源格式與連結、冪等、失敗保留及成功移除舊事件。`tests/CalendarPanel.test.tsx` 驗證時間／缺時刻、地區／關鍵字／天數篩選、過期失敗提示、範圍限制及總覽入口。正式 Pages 子目錄檢查會驗證日曆快照可讀。
