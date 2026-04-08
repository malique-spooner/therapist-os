from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select

from backend.models.life_data import HabitLogDemo as HabitLog, MonthlyBudgetDemo as MonthlyBudget
from backend.services.notifications import NotificationService


@pytest.mark.asyncio
async def test_daily_checkin_reminder_triggers_when_mood_not_logged(db_session, monkeypatch):
    sent: list[tuple[str, str]] = []

    async def fake_send(*, title: str, message: str, priority: str = "default", tags=None):
        sent.append((title, message))

    service = NotificationService()
    monkeypatch.setattr(service, "send", fake_send)

    mood_log = db_session.scalar(select(HabitLog).where(HabitLog.habit_id == "mood", HabitLog.date == date.today()))
    if mood_log:
        db_session.delete(mood_log)
        db_session.commit()

    await service.send_daily_checkin_reminder(db_session)
    assert sent
    assert sent[0][0] == "Morning check-in"


@pytest.mark.asyncio
async def test_budget_warning_triggers_when_budget_is_high(db_session, monkeypatch):
    sent: list[str] = []

    async def fake_send(*, title: str, message: str, priority: str = "default", tags=None):
        sent.append(title)

    service = NotificationService()
    monkeypatch.setattr(service, "send", fake_send)

    budget = db_session.scalar(select(MonthlyBudget).limit(1))
    budget.limit_pence = 1000
    budget.spent_pence = 900
    db_session.commit()

    await service.send_budget_warning(db_session)
    assert "AI budget check" in sent
