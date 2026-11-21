import { describe, expect, it } from "vitest";
import {
  defaultLayout,
  parseLayout,
  moveCard,
  readLayout,
  LAYOUT_KEY,
} from "../src/layout";
describe("版面保存與匯入", () => {
  it("預設提供 Nikkei、SOX 等卡片，不包含 AI 基本面", () => {
    const l = defaultLayout();
    expect(l.cards.some((c) => c.id === "nikkei" && c.visible)).toBe(true);
    expect(l.cards.some((c) => c.id === "nvRevenue")).toBe(false);
  });
  it("排序、隱藏、風格與寬度可往返序列化", () => {
    let l = defaultLayout();
    l = moveCard(l, "nikkei", "us10y");
    l.cards[0] = { ...l.cards[0], visible: false, style: "trend", width: 2 };
    expect(parseLayout(JSON.parse(JSON.stringify(l))).cards[0]).toEqual(
      l.cards[0],
    );
  });
  it("未知、重複指標、非法寬度或風格不得匯入", () => {
    for (const card of [
      { id: "nvRevenue", visible: true, style: "full", width: 1 },
      { id: "sox", visible: true, style: "<script>", width: 1 },
      { id: "sox", visible: true, style: "full", width: 999 },
    ])
      expect(() =>
        parseLayout({ version: 1, sort: "manual", cards: [card] }),
      ).toThrow();
    const c = defaultLayout().cards[0];
    expect(() =>
      parseLayout({ version: 1, sort: "manual", cards: [c, c] }),
    ).toThrow();
  });
  it("損壞的瀏覽器儲存會還原可用預設值", () => {
    localStorage.setItem(LAYOUT_KEY, "broken-json");
    expect(readLayout()).toEqual(defaultLayout());
    localStorage.clear();
  });
});
