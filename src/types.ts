export interface Observation {
  metricId: string;
  date: string;
  value: number | null;
  status: "verified" | "missing";
  source: { name: string; url: string };
  retrievedAt: string;
  publishedAt: string | null;
  unit: string;
  market: string;
  timezone: string;
  reason?: string;
  period?: string;
  meetingDate?: string;
  vintage: string;
  method: "official-api" | "reviewed-import" | "market-data-api";
  sessionStatus?: "close" | "snapshot";
  evidence?: string;
  rawHash?: string;
  sentiment?: { rating: string; updatedAt?: string; previousClose?: number };
  quote?: {
    symbol: string;
    quotedAt: string;
    referencePrice: number;
    change: number;
    changePct: number;
  };
}
export interface FundamentalEvent {
  id: string;
  company: string;
  period: string;
  title: string;
  detail: string;
  publishedAt: string;
  retrievedAt: string;
  source: { name: string; url: string };
  evidence: string;
}
export interface Run {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "partial" | "failed";
  providers: {
    name: string;
    status: "success" | "failed";
    count: number;
    message?: string;
  }[];
}
export interface Dataset {
  schemaVersion: 1;
  generatedAt: string;
  observations: Observation[];
  events: FundamentalEvent[];
  runs: Run[];
  policy?: PolicyItem[];
}
export interface PolicyItem {
  id: string;
  kind: "fomc" | "fedwatch-commentary";
  date: string;
  title: string;
  summary: string;
  source: { name: string; url: string };
  publishedAt: string | null;
  retrievedAt: string;
  confidence: "official" | "reported";
  meetingDate?: string;
  referenceUrl?: string;
  approximate?: boolean;
}
