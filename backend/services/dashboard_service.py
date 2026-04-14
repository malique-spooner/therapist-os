from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.life_data import (
    FinanceDataReal,
    HabitLogReal,
    HealthDataReal,
    LocationDailySummaryReal,
    MusicDataReal,
    WeatherDataReal,
)
from .insights_service import InsightsService
from .periods import date_window


class DashboardService:
    def __init__(self) -> None:
        self.insights_service = InsightsService()

    def _load_health(self, db: Session, period: str, mode: str | None) -> list:
        start, end = date_window(period)
        return db.scalars(select(HealthDataReal).where(HealthDataReal.date.between(start, end)).order_by(HealthDataReal.date)).all()

    def _load_finance(self, db: Session, period: str, mode: str | None) -> list:
        start, end = date_window(period)
        return db.scalars(select(FinanceDataReal).where(FinanceDataReal.date.between(start, end)).order_by(FinanceDataReal.date)).all()

    def _load_habits(self, db: Session, period: str, mode: str | None) -> list:
        start, end = date_window(period)
        return db.scalars(select(HabitLogReal).where(HabitLogReal.date.between(start, end)).order_by(HabitLogReal.date)).all()

    def _load_weather(self, db: Session, period: str, mode: str | None) -> list:
        start, end = date_window(period)
        return db.scalars(select(WeatherDataReal).where(WeatherDataReal.date.between(start, end)).order_by(WeatherDataReal.date)).all()

    def _load_music(self, db: Session, period: str, mode: str | None) -> list:
        start, end = date_window(period)
        return db.scalars(select(MusicDataReal).where(MusicDataReal.date.between(start, end)).order_by(MusicDataReal.date)).all()

    def _load_location(self, db: Session, period: str, mode: str | None) -> list:
        start, end = date_window(period)
        return db.scalars(select(LocationDailySummaryReal).where(LocationDailySummaryReal.date.between(start, end)).order_by(LocationDailySummaryReal.date)).all()

    def build_dashboard(self, db: Session, period: str, mode: str | None = None) -> dict:
        health = self._load_health(db, period, mode)
        finance = self._load_finance(db, period, mode)
        habits = self._load_habits(db, period, mode)
        weather = self._load_weather(db, period, mode)
        music = self._load_music(db, period, mode)
        location = self._load_location(db, period, mode)

        avg_steps = round(mean(item.steps or 0 for item in health)) if health else 0
        avg_sleep = round(mean(item.sleep_quality or 0 for item in health), 1) if health else 0
        spend_total = round(sum(item.amount_pence for item in finance) / 100)

        prev_health = self._load_health(db, "last-week", mode)
        prev_steps = round(mean(item.steps or 0 for item in prev_health)) if prev_health else 0
        step_trend = round(((avg_steps - prev_steps) / prev_steps) * 100) if prev_steps else 0
        window_label = "today" if period == "today" else "selected window"
        spend_label = "Today Spend" if period == "today" else "Window Spend"

        spend_by_date: dict[str, int] = defaultdict(int)
        spend_by_category: dict[str, int] = defaultdict(int)
        for item in finance:
            spend_by_date[item.date.isoformat()] += round(item.amount_pence / 100)
            spend_by_category[item.category] += round(item.amount_pence / 100)

        enough_data = bool(health or finance or habits or weather or music or location)
        hero_headline = self.insights_service.generate_hero_headline(period, db, mode) if enough_data else "Not enough data yet to generate a reliable daily read."
        cards = self.insights_service.generate_dashboard_insights(period, db, mode) if enough_data else []

        health_tail = health[-14:] if len(health) >= 14 else health
        dates = [item.date.isoformat() for item in health_tail]
        spend_tail = [float(spend_by_date.get(day, 0)) for day in dates]

        return {
            "greeting": "Good morning",
            "dateLabel": date.today().strftime("%A, %-d %B %Y") if hasattr(date.today(), "strftime") else date.today().isoformat(),
            "heroInsight": {
                "weekOf": (date.today() - timedelta(days=date.today().weekday())).isoformat(),
                "heroHeadline": hero_headline,
            "heroFramework": "CBT",
            "cards": cards,
        },
            "rings": [
                {
                    "label": "Movement",
                    "value": f"{avg_steps:,}",
                    "unit": "daily movement",
                    "percentage": min(100, round((avg_steps / 12000) * 100)) if avg_steps else 0,
                    "trend": "today focus" if period == "today" else f"{step_trend:+d}% vs recent baseline",
                    "trendPositive": step_trend >= 0,
                },
                {
                    "label": "Sleep Quality",
                    "value": str(avg_sleep),
                    "unit": "out of 10",
                    "percentage": min(100, round((avg_sleep / 10) * 100)) if avg_sleep else 0,
                    "trend": "last sleep block" if period == "today" else "recent daily pattern",
                    "trendPositive": True,
                },
                {
                    "label": spend_label,
                    "value": f"£{spend_total}",
                    "unit": "current window",
                    "percentage": min(100, round((spend_total / max(1, 350 * max(len(health), 7) / 7)) * 100)),
                    "trend": "daily spend signal" if period == "today" else "lower is better here",
                    "trendPositive": spend_total <= 350,
                },
            ],
            "miniTrends": [
                {
                    "label": "Sleep",
                    "data": [float(item.sleep_quality or 0) for item in health_tail],
                    "latest": str(health_tail[-1].sleep_quality if health_tail else 0),
                    "unit": "/10",
                    "invertTrend": False,
                },
                {
                    "label": "Steps",
                    "data": [round((item.steps or 0) / 1000, 1) for item in health_tail],
                    "latest": f"{round((health_tail[-1].steps or 0) / 1000, 1) if health_tail else 0}",
                    "unit": "k",
                    "invertTrend": False,
                },
                {
                    "label": "Spend",
                    "data": spend_tail,
                    "latest": f"£{int(spend_tail[-1]) if spend_tail else 0}",
                    "unit": "£",
                    "invertTrend": True,
                },
            ],
            "insights": cards,
            "windowLabel": window_label,
            "status": "ready" if enough_data else "waiting-for-data",
        }
