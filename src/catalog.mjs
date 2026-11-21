const sources = {
  treasury: {
    name: "美國財政部",
    url: "https://home.treasury.gov/treasury-daily-interest-rate-xml-feed",
  },
  fred: { name: "FRED／原始發布機構", url: "https://fred.stlouisfed.org/" },
  twse: { name: "臺灣證券交易所", url: "https://www.twse.com.tw/" },
  tpex: { name: "證券櫃檯買賣中心", url: "https://www.tpex.org.tw/" },
  taifex: {
    name: "臺灣期貨交易所",
    url: "https://www.taifex.com.tw/cht/3/futContractsDate",
  },
  cme: {
    name: "CME FedWatch",
    url: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
  },
  tsmc: {
    name: "台積電投資人關係",
    url: "https://investor.tsmc.com/english/monthly-revenue",
  },
  nvidia: { name: "NVIDIA 投資人關係", url: "https://investor.nvidia.com/" },
  microsoft: {
    name: "Microsoft 投資人關係",
    url: "https://www.microsoft.com/en-us/Investor/",
  },
  alphabet: { name: "Alphabet 投資人關係", url: "https://abc.xyz/investor/" },
  amazon: { name: "Amazon 投資人關係", url: "https://ir.aboutamazon.com/" },
  meta: { name: "Meta 投資人關係", url: "https://investor.atmeta.com/" },
};
const m = (id, label, unit, group, source, extra = {}) => ({
  id,
  label,
  unit,
  group,
  source: sources[source],
  precision: 2,
  maxAge: 7,
  change: "percent",
  direction: "context",
  threshold: 0,
  note: "",
  meeting: false,
  dailyMarket: null,
  ...extra,
});
export const METRICS = [
  m("us2y", "美債 2Y", "%", "macro", "treasury", {
    change: "bp",
    precision: 2,
    threshold: 10,
  }),
  m("us10y", "美債 10Y", "%", "macro", "treasury", {
    change: "bp",
    precision: 2,
    threshold: 10,
  }),
  m("us30y", "美債 30Y", "%", "macro", "treasury", {
    change: "bp",
    precision: 2,
    threshold: 10,
  }),
  m("fedCut", "降息機率", "%", "fed", "cme", {
    change: "pp",
    threshold: 15,
    meeting: true,
    maxAge: 3,
  }),
  m("fedHold", "維持機率", "%", "fed", "cme", {
    change: "pp",
    threshold: 15,
    meeting: true,
    maxAge: 3,
  }),
  m("fedHike", "升息機率", "%", "fed", "cme", {
    change: "pp",
    threshold: 15,
    meeting: true,
    maxAge: 3,
  }),
  m("usdtwd", "美元／新台幣", "TWD", "macro", "fred", {
    precision: 3,
    threshold: 0.5,
    direction: "down",
    note: "Fed H.10 美國午間買入匯率，非台北外匯收盤",
  }),
  m("wti", "WTI 原油現貨", "USD／桶", "macro", "fred", {
    threshold: 3,
    note: "EIA Cushing 現貨，非期貨結算",
  }),
  m("brent", "Brent 原油現貨", "USD／桶", "macro", "fred", {
    threshold: 3,
    note: "EIA Europe Brent 現貨，非期貨結算",
  }),
  m("sp500", "S&P 500", "點", "global", "fred", {
    threshold: 2,
    direction: "up",
  }),
  m("nasdaq", "NASDAQ", "點", "global", "fred", {
    threshold: 2,
    direction: "up",
  }),
  m("sox", "費城半導體 SOX", "點", "global", "fred", {
    threshold: 2,
    direction: "up",
    note: "Yahoo Finance 日線收盤；來源與觀測日逐筆保留",
    source: {
      name: "Nasdaq 指數資料",
      url: "https://indexes.nasdaq.com/Index/Overview/SOX",
    },
  }),
  m("kospi", "韓國 KOSPI", "點", "global", "fred", {
    threshold: 2,
    direction: "up",
    note: "Yahoo Finance KOSPI 價格指數日線，非期貨",
    source: { name: "韓國交易所 KRX", url: "https://data.krx.co.kr/" },
  }),
  m("nikkei", "日經 Nikkei 225", "點", "global", "fred", {
    threshold: 2,
    direction: "up",
    source: {
      name: "Nikkei／Yahoo Finance",
      url: "https://indexes.nikkei.co.jp/en/nkave",
    },
    note: "Nikkei 225 價格指數，非期貨；收盤以原市場交易日記錄",
  }),
  m("taiex", "台灣加權指數", "點", "global", "twse", {
    threshold: 2,
    direction: "up",
  }),
  m("tpex", "櫃買指數", "點", "global", "tpex", {
    threshold: 2,
    direction: "up",
  }),
  m("foreign", "外資買賣超・上市", "億元", "flow", "twse", {
    change: "absolute",
    direction: "up",
    threshold: 300,
  }),
  m("trust", "投信買賣超・上市", "億元", "flow", "twse", {
    change: "absolute",
    direction: "up",
  }),
  m("dealer", "自營商買賣超・上市", "億元", "flow", "twse", {
    change: "absolute",
    direction: "up",
  }),
  m("foreignOtc", "外資買賣超・上櫃", "億元", "flow", "tpex", {
    change: "absolute",
    direction: "up",
  }),
  m("futures", "外資台指期淨部位", "口", "flow", "taifex", {
    change: "absolute",
    precision: 0,
    direction: "up",
    note: "TX 大台，多方未平倉減空方；不含小台、微台",
  }),
  m("marginTw", "融資餘額・上市", "億元", "structure", "twse", {
    change: "absolute",
  }),
  m("marginOtc", "融資餘額・上櫃", "億元", "structure", "tpex", {
    change: "absolute",
  }),
  m("advancers", "上漲家數・上市", "家", "structure", "twse", {
    change: "absolute",
    precision: 0,
  }),
  m("decliners", "下跌家數・上市", "家", "structure", "twse", {
    change: "absolute",
    precision: 0,
  }),
  m("advancersOtc", "上漲家數・上櫃", "家", "structure", "tpex", {
    change: "absolute",
    precision: 0,
    note: "上櫃日行情四位數股票代碼且有數值漲跌；排除 ETF、權證與無比價",
  }),
  m("declinersOtc", "下跌家數・上櫃", "家", "structure", "tpex", {
    change: "absolute",
    precision: 0,
    note: "上櫃日行情四位數股票代碼且有數值漲跌；排除 ETF、權證與無比價",
  }),
  m("volume", "成交股數・上市", "億股", "structure", "twse", {
    change: "percent",
    note: "TWSE FMTQIK 全市場成交股數",
  }),
  m("turnover", "成交金額・上市", "億元", "structure", "twse", {
    change: "percent",
  }),
  m("tsmcRevenue", "台積電月營收", "億元 TWD", "ai", "tsmc", {
    maxAge: 65,
    change: "percent",
    note: "單月營收，非每日數據",
  }),
  m("tsmcYoy", "台積電營收年增", "%", "ai", "tsmc", {
    maxAge: 65,
    change: "pp",
  }),
  m("nvRevenue", "NVIDIA 季營收", "十億 USD", "ai", "nvidia", {
    maxAge: 140,
    change: "percent",
  }),
  m("nvEps", "NVIDIA 稀釋 EPS", "USD", "ai", "nvidia", {
    maxAge: 140,
    change: "percent",
    note: "GAAP；不得混用調整後 EPS",
  }),
  m("nvMargin", "NVIDIA 毛利率", "%", "ai", "nvidia", {
    maxAge: 140,
    change: "pp",
    note: "GAAP",
  }),
  m("msCapex", "Microsoft 資本支出", "十億 USD", "ai", "microsoft", {
    maxAge: 140,
    change: "percent",
    note: "依財報期間與口徑記錄，非年度指引",
  }),
  m("googCapex", "Alphabet 資本支出", "十億 USD", "ai", "alphabet", {
    maxAge: 140,
    change: "percent",
  }),
  m("amznCapex", "Amazon 資本支出", "十億 USD", "ai", "amazon", {
    maxAge: 140,
    change: "percent",
  }),
  m("metaCapex", "Meta 資本支出", "十億 USD", "ai", "meta", {
    maxAge: 140,
    change: "percent",
  }),
];
for (const metric of METRICS) {
  if (["sp500", "nasdaq", "sox"].includes(metric.id)) metric.dailyMarket = "US";
  if (metric.id === "kospi") metric.dailyMarket = "KR";
  if (metric.id === "nikkei") metric.dailyMarket = "JP";
  if (
    ["taiex", "tpex"].includes(metric.id) ||
    ["flow", "structure"].includes(metric.group)
  )
    metric.dailyMarket = "TW";
}
export const CATALOG = Object.fromEntries(METRICS.map((x) => [x.id, x]));
// Preserve historical AI data validation while removing it from navigation and coverage.
export const ACTIVE_METRICS = METRICS.filter((metric) => metric.group !== "ai");
export const RULE_VERSION = "regime-v2-close";
export const GROUPS = {
  macro: "總經與利率",
  fed: "FedWatch",
  global: "全球股市",
  flow: "法人與期貨",
  structure: "市場結構",
  ai: "AI 基本面",
};
