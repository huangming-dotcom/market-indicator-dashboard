"""Build versioned exchange sessions; developer-only dependency, not needed by Node runtime.
Install exchange-calendars==4.13.3 in an isolated Python environment before running.
The community calendar model can be amended for newly announced exchange closures.
"""
from pathlib import Path
import json
import exchange_calendars as xcals

result = {"version": 1, "source": "https://github.com/gerrymanoim/exchange_calendars", "packageVersion": xcals.__version__, "start": "2025-01-01", "end": "2027-12-31", "markets": {}}
for market, code in {"US": "XNYS", "TW": "XTAI", "JP": "XTKS", "KR": "XKRX"}.items():
    calendar = xcals.get_calendar(code, start=result["start"], end=result["end"])
    result["markets"][market] = [{"date": str(day.date()), "close": row["close"].isoformat()} for day, row in calendar.schedule.iterrows()]
target = Path(__file__).resolve().parents[1] / "src" / "data" / "exchange-sessions.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print({k: len(v) for k, v in result["markets"].items()})
