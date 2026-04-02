from __future__ import annotations

from datetime import date, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..core.logging import get_logger
from ..models import HabitLog, MonthlyBudget, UserProfile

logger = get_logger(__name__)


class NotificationService:
    @property
    def is_configured(self) -> bool:
        return bool(settings.NTFY_TOPIC and settings.NTFY_SERVER)

    async def send(self, title: str, message: str, priority: str = "default", tags: list[str] | None = None) -> None:
        if not self.is_configured:
            return
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{settings.NTFY_SERVER.rstrip('/')}/{settings.NTFY_TOPIC}",
                content=message.encode("utf-8"),
                headers={
                    "Title": title,
                    "Priority": priority,
                    "Tags": ",".join(tags or []),
                },
            )
            response.raise_for_status()
        logger.info("notification_sent", extra={"event": "notification_sent", "extra_data": {"title": title, "priority": priority}})

    async def send_daily_checkin_reminder(self, db: Session) -> None:
        today = date.today()
        mood_log = db.scalar(select(HabitLog).where(HabitLog.habit_id == "mood", HabitLog.date == today))
        if mood_log and mood_log.scale_value is not None:
            return
        await self.send(
            title="Morning check-in",
            message="How are you feeling today? Open Therapist OS to log your morning check-in.",
            tags=["brain"],
        )

    async def send_weekly_summary(self, db: Session) -> None:
        profile = db.scalar(select(UserProfile).limit(1))
        if profile and profile.notable_patterns:
            summary = (
                f"This week, the clearest pattern remained {profile.notable_patterns[0].lower()} "
                f"One focus for next week: keep the basics steady before asking more from yourself."
            )
        else:
            summary = "This week looked like a reminder that consistency matters more than intensity. Keep one reliable habit protected next week."
        await self.send(
            title="Your week in review",
            message=summary,
            tags=["chart_increasing"],
        )

    async def send_budget_warning(self, db: Session) -> None:
        budget = db.scalar(select(MonthlyBudget).where(MonthlyBudget.month == date.today().replace(day=1)))
        if not budget or budget.limit_pence <= 0:
            return
        if budget.spent_pence < int(budget.limit_pence * 0.8):
            return
        remaining_pence = max(0, budget.limit_pence - budget.spent_pence)
        await self.send(
            title="AI budget check",
            message=f"You've used most of this month's AI budget. About £{remaining_pence / 100:.2f} remains.",
            priority="high",
            tags=["moneybag"],
        )
