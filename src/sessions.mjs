import calendars from "./data/exchange-sessions.json" with { type: "json" };

export const calendarInfo = {
  source: calendars.source,
  version: calendars.packageVersion,
  start: calendars.start,
  end: calendars.end,
};
const taipeiDate = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
export function expectedSession(market, date, now = new Date().toISOString()) {
  if (
    !market ||
    date < calendars.start ||
    date > calendars.end ||
    date > taipeiDate(now)
  )
    return null;
  const sessions = calendars.markets[market];
  if (!sessions) return null;
  // A historical selection denotes the local trading date, but never includes
  // a session that is still open now (US evening can already be tomorrow in Taipei).
  return (
    sessions
      .filter(
        (session) =>
          session.date <= date && Date.parse(session.close) <= Date.parse(now),
      )
      .at(-1) ?? null
  );
}
export function sessionLag(market, observationDate, expectedDate) {
  if (!observationDate || !expectedDate) return null;
  return (calendars.markets[market] ?? []).filter(
    (s) => s.date > observationDate && s.date <= expectedDate,
  ).length;
}
export function isCompletedSession(
  market,
  date,
  now = new Date().toISOString(),
) {
  const session = calendars.markets[market]?.find((s) => s.date === date);
  return !!session && Date.parse(session.close) <= Date.parse(now);
}
