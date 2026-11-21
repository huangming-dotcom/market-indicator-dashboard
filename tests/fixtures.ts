import type { Dataset, Observation } from "../src/types";
import { CATALOG } from "../src/catalog.mjs";
// Synthetic fixtures are exclusively used by tests, never copied to public/data.
export const obs = (
  metricId: string,
  date: string,
  value: number | null,
  extra: Partial<Observation> = {},
): Observation => ({
  metricId,
  date,
  value,
  status: value === null ? "missing" : "verified",
  source: {
    name: "測試資料（非行情）",
    url: "https://example.com/test-fixture",
  },
  retrievedAt: "2026-11-21T08:00:00Z",
  publishedAt: null,
  unit: CATALOG[metricId].unit,
  market: "TEST",
  timezone: "Asia/Taipei",
  vintage: "2026-11-21T08:00:00Z",
  method: "official-api",
  ...(value === null ? { reason: "test missing" } : {}),
  ...extra,
});
export const dataset = (observations: Observation[] = []): Dataset => ({
  schemaVersion: 1,
  generatedAt: "2026-11-21T08:00:00Z",
  observations,
  events: [],
  runs: [],
});
