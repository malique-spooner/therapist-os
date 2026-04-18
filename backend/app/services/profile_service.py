from __future__ import annotations

from datetime import date, timedelta
from statistics import mean

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.life_data import (
    AIConversationReal,
    DailyCheckInReal,
    FinanceDataReal,
    HabitLogReal,
    HealthDataReal,
    LocationDailySummaryReal,
    MusicDataReal,
    UserProfileReal,
)


class ProfileService:
    def has_profile_inputs(self, db: Session, mode: str | None = None) -> bool:
        counts = [
            db.scalar(select(func.count()).select_from(HealthDataReal)) or 0,
            db.scalar(select(func.count()).select_from(FinanceDataReal)) or 0,
            db.scalar(select(func.count()).select_from(HabitLogReal)) or 0,
            db.scalar(select(func.count()).select_from(MusicDataReal)) or 0,
            db.scalar(select(func.count()).select_from(LocationDailySummaryReal)) or 0,
            db.scalar(select(func.count()).select_from(DailyCheckInReal)) or 0,
        ]
        return sum(counts) > 0

    @staticmethod
    def empty_profile_payload() -> dict:
        return {
            "profileDocument": (
                "## Personal Context\nNo real profile has been built yet.\n\n"
                "## What This Means\nTherapist OS needs more real check-ins, synced domains, or therapist sessions before it can describe your actual patterns confidently."
            ),
            "keyThemes": [],
            "activeGoals": [],
            "notablePatterns": [],
        }

    def _profile(self, db: Session, mode: str | None = None):
        profile = db.scalar(select(UserProfileReal).limit(1))
        if profile is None:
            profile = UserProfileReal(
                profile_document="## Personal Context\nNo profile has been built yet.",
            )
            db.add(profile)
            db.flush()
        return profile

    async def update_profile(self, db: Session, mode: str | None = None) -> UserProfile:
        profile = self._profile(db, mode)
        today = date.today()
        start = today - timedelta(days=29)

        health = db.scalars(
            select(HealthDataReal).where(HealthDataReal.date >= start).order_by(HealthDataReal.date)
        ).all()
        finance = db.scalars(select(FinanceDataReal).where(FinanceDataReal.date >= start)).all()
        habits = db.scalars(select(HabitLogReal).where(HabitLogReal.date >= start)).all()
        music = db.scalars(select(MusicDataReal).where(MusicDataReal.date >= start)).all()
        location = db.scalars(
            select(LocationDailySummaryReal).where(LocationDailySummaryReal.date >= start)
        ).all()
        sessions = db.scalars(
            select(AIConversationReal).order_by(AIConversationReal.started_at.desc()).limit(10)
        ).all()

        avg_sleep_hours = round(mean(item.sleep_duration_hours or 0 for item in health), 1) if health else 0
        avg_steps = round(mean(item.steps or 0 for item in health)) if health else 0
        avg_resting_hr = round(mean(item.resting_hr or 0 for item in health)) if health else 0
        total_spend = round(sum(item.amount_pence for item in finance) / 100)
        mood_logs = [log.scale_value for log in habits if log.habit_id == "mood" and log.scale_value is not None]
        mood_avg = round(mean(mood_logs), 1) if mood_logs else None
        avg_music_energy = round(mean(item.average_energy or 0 for item in music), 2) if music else None
        avg_home_hours = round(mean(item.home_hours or 0 for item in location), 1) if location else None

        key_themes = [
            "sleep consistency",
            "planned movement",
            "budget awareness",
        ]
        if avg_music_energy is not None:
            key_themes.append("music as mood regulation")

        notable_patterns = [
            f"Sleep has averaged {avg_sleep_hours} hours with {avg_steps:,} steps a day over the last month.",
            f"Spending over the last 30 days totalled about £{total_spend}.",
        ]
        if mood_avg is not None:
            notable_patterns.append(f"Mood check-ins have averaged {mood_avg}/10 over the last month.")
        if avg_home_hours is not None:
            notable_patterns.append(f"Tracked days suggest about {avg_home_hours} hours at home on an average day.")

        profile.profile_document = (
            "## Personal Context\n"
            "A reflective person using Therapist OS to understand how daily behaviour shapes mood, energy, and spending.\n\n"
            "## Core Patterns\n"
            f"Sleep averages around {avg_sleep_hours} hours, steps average {avg_steps:,}, and spending patterns are still shaped by convenience and social momentum.\n\n"
            "## Psychological Profile\n"
            "CBT works best when tied to concrete behaviour patterns, while SDT framing helps when motivation is low.\n\n"
            "## Active Goals\n"
            "Protect sleep, keep movement regular, and stay more deliberate with spending.\n\n"
            "## Important Relationships\n"
            "Meaningful connection tends to support movement, mood, and follow-through.\n\n"
            "## What Works For Them\n"
            "Planning basics early, naming mood states, and using structure before motivation arrives.\n\n"
            "## Current Focus Areas\n"
            "Consistency over intensity.\n\n"
            "## Data Baselines\n"
            f"Sleep: {avg_sleep_hours}h avg. Steps: {avg_steps:,} avg. Resting HR: {avg_resting_hr} avg."
        )
        profile.total_sessions = len(sessions)
        profile.key_themes = key_themes
        profile.active_goals = ["Protect sleep", "Keep workouts regular", "Stay deliberate with spending"]
        profile.notable_patterns = notable_patterns
        profile.health_baseline = {"sleep_hours": avg_sleep_hours, "steps": avg_steps, "resting_hr": avg_resting_hr}
        profile.mood_baseline = mood_avg

        db.commit()
        db.refresh(profile)
        return profile
