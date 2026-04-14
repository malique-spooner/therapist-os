from __future__ import annotations

from datetime import date, timedelta


PERIOD_TO_DAYS = {
    "today": 1,
    "week": 7,
    "this-week": 7,
    "last-week": 7,
    "month": 31,
    "this-month": 31,
    "last-month": 31,
    "3months": 90,
    "3-months": 90,
    "12months": 365,
    "12-months": 365,
}


def date_window(period: str) -> tuple[date, date]:
    today = date.today()
    days = PERIOD_TO_DAYS.get(period, 7)
    if period == "today":
        start = today
        end = today
    elif period == "last-week":
        end = today - timedelta(days=7)
        start = end - timedelta(days=6)
    elif period == "last-month":
        end = today - timedelta(days=31)
        start = end - timedelta(days=30)
    else:
        end = today
        start = today - timedelta(days=days - 1)
    return start, end
