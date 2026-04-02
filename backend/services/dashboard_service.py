from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import FinanceData, HabitLog, HealthData, WeatherData
from .insights_service import InsightsService
from .periods import date_window


class DashboardService:
    def __init__(self) -> None:
        self.insights_service = InsightsService()

    def _load_health(self, db: Session, period: str) -> list[HealthData]:
        start, end = date_window(period)
        return db.scalars(select(HealthData).where(HealthData.date.between(start, end)).order_by(HealthData.date)).all()

    def _load_finance(self, db: Session, period: str) -> list[FinanceData]:
        start, end = date_window(period)
        return db.scalars(select(FinanceData).where(FinanceData.date.between(start, end)).order_by(FinanceData.date)).all()

    def _load_habits(self, db: Session, period: str) -> list[HabitLog]:
        start, end = date_window(period)
        return db.scalars(select(HabitLog).where(HabitLog.date.between(start, end)).order_by(HabitLog.date)).all()

    def _load_weather(self, db: Session, period: str) -> list[WeatherData]:
        start, end = date_window(period)
        return db.scalars(select(WeatherData).where(WeatherData.date.between(start, end)).order_by(WeatherData.date)).all()

    def build_dashboard(self, db: Session, period: str) -> dict:
        health = self._load_health(db, period)
        finance = self._load_finance(db, period)
        habits = self._load_habits(db, period)
        weather = self._load_weather(db, period)

        avg_steps = round(mean(item.steps or 0 for item in health)) if health else 0
        avg_sleep = round(mean(item.sleep_quality or 0 for item in health), 1) if health else 0
        spend_total = round(sum(item.amount_pence for item in finance) / 100)

        prev_health = self._load_health(db, "last-week")
        prev_steps = round(mean(item.steps or 0 for item in prev_health)) if prev_health else 0
        step_trend = round(((avg_steps - prev_steps) / prev_steps) * 100) if prev_steps else 0

        spend_by_date: dict[str, int] = defaultdict(int)
        spend_by_category: dict[str, int] = defaultdict(int)
        for item in finance:
            spend_by_date[item.date.isoformat()] += round(item.amount_pence / 100)
            spend_by_category[item.category] += round(item.amount_pence / 100)

        hero_headline = self.insights_service.generate_hero_headline(period, db)
        cards = self.insights_service.generate_dashboard_insights(period, db)

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
                    "unit": "steps/day",
                    "percentage": min(100, round((avg_steps / 12000) * 100)) if avg_steps else 0,
                    "trend": f"{step_trend:+d}% vs last week",
                    "trendPositive": step_trend >= 0,
                },
                {
                    "label": "Sleep Quality",
                    "value": str(avg_sleep),
                    "unit": "out of 10",
                    "percentage": min(100, round((avg_sleep / 10) * 100)) if avg_sleep else 0,
                    "trend": "Pattern held steady",
                    "trendPositive": True,
                },
                {
                    "label": "Weekly Spend",
                    "value": f"£{spend_total}",
                    "unit": "current window",
                    "percentage": min(100, round((spend_total / max(1, 350 * max(len(health), 7) / 7)) * 100)),
                    "trend": "Lower is better here",
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
        }
