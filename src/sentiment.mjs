export const CNN_RATINGS = {
  "extreme fear": { label: "極度恐懼", tone: "extreme-fear" },
  fear: { label: "恐懼", tone: "fear" },
  neutral: { label: "中性", tone: "neutral" },
  greed: { label: "貪婪", tone: "greed" },
  "extreme greed": { label: "極度貪婪", tone: "extreme-greed" },
};
export const CNN_RATING_KEYS = Object.keys(CNN_RATINGS);
export const sentimentRating = (rating) =>
  CNN_RATINGS[rating] ?? { label: "分類缺值", tone: "unknown" };
