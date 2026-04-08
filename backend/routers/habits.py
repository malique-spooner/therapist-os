from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import Habit
from ..models.life_data import HabitLogDemo, HabitLogReal
from ..schemas.habits import HabitLogUpsert, HabitUpsert, HabitsOverviewSchema
from ..services.data_mode import dataset_model

router = APIRouter(prefix="/habits", tags=["habits"], dependencies=[Depends(verify_api_key)])


def _build_habit_sentence(action_text: str | None, when_text: str | None, why_text: str | None, fallback: str) -> str:
    if action_text and when_text and why_text:
        return f"I will {action_text.strip()} {when_text.strip()} because {why_text.strip()}."
    return fallback


def _compact_frequency_label(payload: HabitUpsert) -> str:
    if payload.cadenceType == "daily":
        return "daily"
    if payload.cadenceType == "weekly-count":
        count = payload.targetCount or 1
        return f"{count}x per week"
    if payload.cadenceType == "trigger":
        return "trigger"
    if payload.cadenceType == "time-of-day":
        return "timed"
    return "custom"


def _serialize_habit(habit: Habit) -> dict:
    return {
        "id": habit.id,
        "name": _build_habit_sentence(habit.action_text, habit.when_text, habit.why_text, habit.name),
        "actionText": habit.action_text,
        "whenText": habit.when_text,
        "whyText": habit.why_text,
        "habitMode": habit.habit_mode,
        "cadenceType": habit.cadence_type,
        "targetCount": habit.target_count,
        "subLabel": habit.sub_label,
        "category": habit.category,
        "categoryIcon": habit.category_icon,
        "type": habit.habit_type,
        "unit": habit.unit,
        "maxValue": habit.max_value,
        "frequency": habit.frequency,
    }


def _is_negative_habit(habit: Habit) -> bool:
    return habit.habit_mode == "bad" or habit.id in {"quit-snus", "smoke-limit"}


def _log_value(log) -> bool | float | int | None:
    if log.completed is not None:
        return log.completed
    if log.numeric_value is not None:
        return log.numeric_value
    if log.scale_value is not None:
        return log.scale_value
    return None


@router.get("", response_model=HabitsOverviewSchema)
def get_habits(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    habits = db.scalars(select(Habit).where(Habit.active.is_(True)).order_by(Habit.created_at)).all()
    history_start = date.today() - timedelta(days=89)
    log_model = dataset_model(mode, HabitLogReal, HabitLogDemo)
    logs = db.scalars(
        select(log_model)
        .where(log_model.date >= history_start)
        .order_by(log_model.date)
    ).all()

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
        habit_logs = db.scalars(
            select(log_model)
            .where(log_model.habit_id == habit.id)
            .order_by(log_model.date)
        ).all()
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
def get_habit_logs(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    habits = db.scalars(select(Habit).where(Habit.active.is_(True))).all()
    habit_ids = {habit.id for habit in habits}
    log_model = dataset_model(mode, HabitLogReal, HabitLogDemo)
    logs = db.scalars(
        select(log_model)
        .where(log_model.habit_id.in_(habit_ids))
        .order_by(log_model.date)
    ).all()
    by_day: dict[str, dict[str, bool | float | int | None]] = defaultdict(dict)
    for log in logs:
        by_day[log.date.isoformat()][log.habit_id] = _log_value(log)
    return [{"date": day, "values": values} for day, values in sorted(by_day.items())]


@router.post("/logs")
def upsert_habit_log(payload: HabitLogUpsert, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    habit = db.get(Habit, payload.habitId)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    target_date = date.fromisoformat(payload.date) if payload.date else date.today()
    log_model = dataset_model(mode or "real-only", HabitLogReal, HabitLogDemo)
    log = db.scalar(select(log_model).where(log_model.habit_id == habit.id, log_model.date == target_date))
    if not log:
        log = log_model(habit_id=habit.id, date=target_date)
        db.add(log)

    log.created_at = datetime.utcnow()
    log.completed = None
    log.numeric_value = None
    log.scale_value = None
    if habit.habit_type == "boolean":
        log.completed = bool(payload.value)
    elif habit.habit_type == "numeric":
        numeric_value = float(payload.value)
        log.numeric_value = max(0.0, numeric_value) if _is_negative_habit(habit) else numeric_value
    else:
        log.scale_value = int(payload.value)

    db.commit()
    return {"detail": "Habit log saved"}


@router.post("", response_model=dict)
def create_habit(payload: HabitUpsert, db: Session = Depends(get_db)) -> dict:
    is_bad_habit = payload.habitMode == "bad"
    habit_type = payload.type or ("numeric" if is_bad_habit else "boolean")
    unit = (payload.unit or "").strip() or ("incidents" if is_bad_habit and habit_type == "numeric" else None)
    habit = Habit(
        name=_build_habit_sentence(payload.actionText, payload.whenText, payload.whyText, payload.actionText),
        action_text=payload.actionText.strip(),
        when_text=payload.whenText.strip(),
        why_text=payload.whyText.strip(),
        habit_mode=payload.habitMode,
        cadence_type=payload.cadenceType,
        target_count=payload.targetCount,
        sub_label=None,
        category=payload.category or "Custom",
        category_icon=payload.categoryIcon or ("🚫" if payload.habitMode == "bad" else "✨"),
        habit_type=habit_type,
        unit=unit,
        max_value=payload.maxValue,
        frequency=_compact_frequency_label(payload),
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return _serialize_habit(habit)


@router.patch("/{habit_id}", response_model=dict)
def update_habit(habit_id: str, payload: HabitUpsert, db: Session = Depends(get_db)) -> dict:
    habit = db.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    habit.name = _build_habit_sentence(payload.actionText, payload.whenText, payload.whyText, payload.actionText)
    habit.action_text = payload.actionText.strip()
    habit.when_text = payload.whenText.strip()
    habit.why_text = payload.whyText.strip()
    habit.habit_mode = payload.habitMode
    habit.cadence_type = payload.cadenceType
    habit.target_count = payload.targetCount
    habit.frequency = _compact_frequency_label(payload)
    is_bad_habit = payload.habitMode == "bad"
    habit.habit_type = payload.type or ("numeric" if is_bad_habit else "boolean")
    habit.unit = (payload.unit or "").strip() or ("incidents" if is_bad_habit and habit.habit_type == "numeric" else None)
    habit.max_value = payload.maxValue
    if payload.category:
        habit.category = payload.category
    if payload.categoryIcon:
        habit.category_icon = payload.categoryIcon

    db.commit()
    db.refresh(habit)
    return _serialize_habit(habit)


@router.delete("/{habit_id}")
def delete_habit(habit_id: str, db: Session = Depends(get_db)) -> dict:
    habit = db.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    habit.active = False
    db.commit()
    return {"detail": "Habit deleted"}
