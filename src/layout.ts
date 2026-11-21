import { z } from "zod";
import { ACTIVE_METRICS } from "./catalog.mjs";
export const LAYOUT_KEY = "market-radar-layout-v1";
const ids = new Set(ACTIVE_METRICS.map((m) => m.id));
export const layoutSchema = z
  .object({
    version: z.literal(1),
    sort: z.enum(["manual", "change", "alerts"]),
    cards: z
      .array(
        z.object({
          id: z.string().refine((id) => ids.has(id), "未知或已移除的指標"),
          visible: z.boolean(),
          style: z.enum(["full", "compact", "trend"]),
          width: z.union([z.literal(1), z.literal(2)]),
        }),
      )
      .max(100),
  })
  .refine(
    (v) => new Set(v.cards.map((c) => c.id)).size === v.cards.length,
    "指標不可重複",
  );
export type Layout = z.infer<typeof layoutSchema>;
const DEFAULT_IDS = [
  "us10y",
  "nasdaq",
  "taiex",
  "sox",
  "sp500",
  "kospi",
  "nikkei",
  "usdtwd",
  "futures",
  "foreign",
  "marginTw",
  "marginOtc",
];
export const defaultLayout = (): Layout => ({
  version: 1,
  sort: "manual",
  cards: [
    ...DEFAULT_IDS,
    ...ACTIVE_METRICS.map((m) => m.id).filter(
      (id) => !DEFAULT_IDS.includes(id),
    ),
  ].map((id) => ({
    id,
    visible: DEFAULT_IDS.includes(id),
    style: "full",
    width: 1,
  })),
});
export function parseLayout(input: unknown): Layout {
  const parsed = layoutSchema.parse(input);
  return {
    ...parsed,
    cards: [
      ...parsed.cards,
      ...ACTIVE_METRICS.filter(
        (m) => !parsed.cards.some((c) => c.id === m.id),
      ).map((m) => ({
        id: m.id,
        visible: false,
        style: "full" as const,
        width: 1 as const,
      })),
    ],
  };
}
export function readLayout(): Layout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? parseLayout(JSON.parse(raw)) : defaultLayout();
  } catch {
    return defaultLayout();
  }
}
export function moveCard(layout: Layout, id: string, target: string): Layout {
  if (id === target) return layout;
  const cards = [...layout.cards],
    from = cards.findIndex((c) => c.id === id),
    to = cards.findIndex((c) => c.id === target);
  if (from < 0 || to < 0) return layout;
  cards.splice(to, 0, cards.splice(from, 1)[0]);
  return { ...layout, sort: "manual", cards };
}
