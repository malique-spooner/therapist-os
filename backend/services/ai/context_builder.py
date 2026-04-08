from __future__ import annotations

from datetime import date, datetime, timedelta
from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...models import Habit
from ...models.life_data import (
    AIConversationDemo,
    AIConversationReal,
    FinanceDataDemo,
    FinanceDataReal,
    HabitLogDemo,
    HabitLogReal,
    HealthDataDemo,
    HealthDataReal,
    UserProfileDemo,
    UserProfileReal,
    WeatherDataDemo,
    WeatherDataReal,
)
from ..data_mode import dataset_model, normalize_data_mode


class ContextBuilder:
    async def build_context_document(self, db: Session, mode: str | None = None) -> str:
        normalized_mode = normalize_data_mode(mode)
        health_model = dataset_model(normalized_mode, HealthDataReal, HealthDataDemo)
        finance_model = dataset_model(normalized_mode, FinanceDataReal, FinanceDataDemo)
        habit_log_model = dataset_model(normalized_mode, HabitLogReal, HabitLogDemo)
        profile_model = dataset_model(normalized_mode, UserProfileReal, UserProfileDemo)
        weather_model = dataset_model(normalized_mode, WeatherDataReal, WeatherDataDemo)
        conversation_model = dataset_model(normalized_mode, AIConversationReal, AIConversationDemo)
        today = date.today()
        health = db.scalars(
            select(health_model).where(health_model.date >= today - timedelta(days=6)).order_by(health_model.date)
        ).all()
        finance = db.scalars(select(finance_model).where(finance_model.date >= today - timedelta(days=6))).all()
        habits = db.scalars(select(Habit)).all()
        habit_logs = db.scalars(select(habit_log_model).where(habit_log_model.date >= today - timedelta(days=6))).all()
        profile = db.scalar(select(profile_model).limit(1))
        recent_sessions = db.scalars(
            select(conversation_model).order_by(conversation_model.started_at.desc()).limit(3)
        ).all()
        weather = db.scalars(
            select(weather_model).where(weather_model.date >= today - timedelta(days=2)).order_by(weather_model.date)
        ).all()

        sections: list[str] = []
        if profile:
            sections.append(f"## About This Person\n{profile.profile_document}")

        if health:
            sections.append(
                "## Recent Physical Health\n"
                f"Average sleep: {mean(item.sleep_duration_hours or 0 for item in health):.1f}h\n"
                f"Average sleep quality: {mean(item.sleep_quality or 0 for item in health):.1f}/10\n"
                f"Average steps: {mean(item.steps or 0 for item in health):.0f}/day"
            )

        if finance:
            weekly_spend = sum(item.amount_pence for item in finance) / 100
            sections.append(f"## Recent Spending Patterns\nTotal last 7 days: £{weekly_spend:.0f}")

        if weather:
            latest_weather = weather[-1]
            sections.append(
                "## Environmental Context\n"
                f"Latest condition: {latest_weather.condition or 'unknown'}\n"
                f"Daylight hours: {latest_weather.daylight_hours:.1f}\n"
                f"Temperature range: {latest_weather.temperature_low_c or 0:.1f}C to {latest_weather.temperature_high_c or 0:.1f}C"
            )

        if habits and habit_logs:
            mood_logs = [log.scale_value for log in habit_logs if log.habit_id == "mood" and log.scale_value is not None]
            if mood_logs:
                sections.append(f"## Recent Check-ins\nMood average over the last week: {mean(mood_logs):.1f}/10")

        if recent_sessions:
            sections.append(f"## Recent Sessions\nThere have been {len(recent_sessions)} recent therapy conversations.")

        return "\n\n".join(sections)

    async def build_system_prompt(self, db: Session, mode: str | None = None) -> str:
        context = await self.build_context_document(db, mode)
        now = datetime.now()
        return (
            "You are a personal AI therapist with access to real data from this person's life. "
            "You are warm, calm, direct, and honest. You ask one question at a time. "
            "Reply once, not twice. Do not restate the same idea in two different phrasings. "
            "Use 1 to 3 short sentences, and ask at most one question. "
            "Write for spoken delivery: natural, grounded, low-hype, and easy to hear out loud. "
            "Prefer simple language over formal therapy language. "
            "The user's latest message always takes priority over any background context. "
            "If they correct a fact, accept the correction and continue from that corrected fact. "
            "Do not act as if they said something else. "
            "Treat the life-data context as optional background, not as something you must mention. "
            "Only bring in background metrics when they are directly relevant to the user's latest message. "
            "If the user corrects a detail, briefly acknowledge the correction and continue without repeating yourself. "
            "Use CBT, Self-Determination Theory, and Behaviourism in accessible language only when helpful.\n\n"
            f"{context}\n\n"
            f"Today's date: {date.today().isoformat()}\n"
            f"Time zone: {settings.USER_TIMEZONE}\n"
            f"Time of day: {now.strftime('%H:%M')}"
        )

    async def generate_opening_message(self, db: Session, mode: str | None = None) -> str:
        normalized_mode = normalize_data_mode(mode)
        health_model = dataset_model(normalized_mode, HealthDataReal, HealthDataDemo)
        profile_model = dataset_model(normalized_mode, UserProfileReal, UserProfileDemo)
        today = date.today()
        health = db.scalar(select(health_model).where(health_model.date == today))
        if health:
            if (health.sleep_duration_hours or 0) < 6:
                return f"You slept {health.sleep_duration_hours:.1f} hours last night, which is below your recent baseline. What feels most important to notice about your energy today?"
            if (health.steps or 0) > 10000:
                return f"You've been moving more than usual, and your recovery markers look steadier today. What's been helping lately?"

        profile = db.scalar(select(profile_model).limit(1))
        if profile and profile.notable_patterns:
            return f"I’m holding the patterns you’ve been working on, especially {profile.notable_patterns[0].lower()}. Where does that feel most active today?"

        return "I’m here with your recent patterns in mind. What feels most worth exploring today?"
