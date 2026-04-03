from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import Habit, HabitLog
from ..schemas.habits import HabitLogUpsert, HabitsOverviewSchema

router = APIRouter(prefix="/habits", tags=["habits"], dependencies=[Depends(verify_api_key)])


def _serialize_habit(habit: Habit) -> dict:
    return {
        "id": habit.id,
        "name": habit.name,
        "subLabel": habit.sub_label,
        "category": habit.category,
        "categoryIcon": habit.category_icon,
        "type": habit.habit_type,
        "unit": habit.unit,
        "maxValue": habit.max_value,
        "frequency": habit.frequency,
    }


def _log_value(log: HabitLog) -> bool | float | int | None:
    if log.completed is not None:
        return log.completed
    if log.numeric_value is not None:
        return log.numeric_value
    if log.scale_value is not None:
        return log.scale_value
    return None


@router.get("", response_model=HabitsOverviewSchema)
def get_habits(db: Session = Depends(get_db)) -> dict:
    habits = db.scalars(select(Habit).where(Habit.active.is_(True)).order_by(Habit.created_at)).all()
    history_start = date.today() - timedelta(days=13)
    logs = db.scalars(select(HabitLog).where(HabitLog.date >= history_start).order_by(HabitLog.date)).all()

    by_day: dict[str, dict[str, bool | float | int | None]] = defaultdict(dict)
    for log in logs:
        by_day[log.date.isoformat()][log.habit_id] = _log_value(log)

    history = [{"date": day, "values": values} for day, values in sorted(by_day.items())]
    today = date.today().isoformat()
    today_completions = by_day.get(today, {})

    weekly_logs = [log for log in logs if log.date >= date.today() - timedelta(days=6)]
    completed = 0
    total = 0
    streaks: dict[str, dict[str, int]] = {}
    for habit in habits:
        habit_logs = db.scalars(select(HabitLog).where(HabitLog.habit_id == habit.id).order_by(HabitLog.date)).all()
        longest = current = 0
        for log in habit_logs:
            done = _log_value(log)
            is_done = bool(done) if isinstance(done, bool) else (done or 0) > 0
            if is_done:
                current += 1
                longest = max(longest, current)
            else:
                current = 0
        current = 0
        for log in reversed(habit_logs):
            done = _log_value(log)
            is_done = bool(done) if isinstance(done, bool) else (done or 0) > 0
            if is_done:
                current += 1
            else:
                break
        streaks[habit.id] = {"streak": current, "longest": longest}

    for log in weekly_logs:
        total += 1
        done = _log_value(log)
        is_done = bool(done) if isinstance(done, bool) else (done or 0) > 0
        if is_done:
            completed += 1

    return {
        "habits": [_serialize_habit(habit) for habit in habits],
        "todayCompletions": today_completions,
        "history": history,
        "weeklyCompletion": round((completed / total) * 100) if total else 0,
        "streaks": streaks,
    }


@router.get("/logs")
def get_habit_logs(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    habits = db.scalars(select(Habit).where(Habit.active.is_(True))).all()
    habit_ids = {habit.id for habit in habits}
    logs = db.scalars(select(HabitLog).where(HabitLog.habit_id.in_(habit_ids)).order_by(HabitLog.date)).all()
    by_day: dict[str, dict[str, bool | float | int | None]] = defaultdict(dict)
    for log in logs:
        by_day[log.date.isoformat()][log.habit_id] = _log_value(log)
    return [{"date": day, "values": values} for day, values in sorted(by_day.items())]


@router.post("/logs")
def upsert_habit_log(payload: HabitLogUpsert, db: Session = Depends(get_db)) -> dict:
    habit = db.get(Habit, payload.habitId)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    target_date = date.fromisoformat(payload.date) if payload.date else date.today()
    log = db.scalar(select(HabitLog).where(HabitLog.habit_id == habit.id, HabitLog.date == target_date))
    if not log:
        log = HabitLog(habit_id=habit.id, date=target_date)
        db.add(log)

    log.completed = None
    log.numeric_value = None
    log.scale_value = None
    if habit.habit_type == "boolean":
        log.completed = bool(payload.value)
    elif habit.habit_type == "numeric":
        log.numeric_value = float(payload.value)
    else:
        log.scale_value = int(payload.value)
    log.is_demo = False

    db.commit()
    return {"detail": "Habit log saved"}
