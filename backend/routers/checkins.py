from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import DailyCheckIn
from ..schemas.checkins import DailyCheckInCreateSchema
from ..services.periods import date_window

router = APIRouter(prefix="/checkins", tags=["checkins"], dependencies=[Depends(verify_api_key)])


def _serialize(row: DailyCheckIn) -> dict:
    return {
        "date": row.date.isoformat(),
        "timestamp": row.timestamp,
        "emotionalState": row.emotional_state,
        "energyLevel": row.energy_level,
        "oneWord": row.one_word,
    }


@router.get("")
def get_checkins(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(select(DailyCheckIn).where(DailyCheckIn.date.between(start, end)).order_by(DailyCheckIn.date)).all()
    return [_serialize(row) for row in rows]


@router.get("/today")
def get_checkin_today(db: Session = Depends(get_db)) -> dict | None:
    row = db.scalar(select(DailyCheckIn).order_by(DailyCheckIn.date.desc()))
    return _serialize(row) if row else None


@router.post("")
def save_checkin(payload: DailyCheckInCreateSchema, db: Session = Depends(get_db)) -> dict:
    today = date.today()
    row = db.scalar(select(DailyCheckIn).where(DailyCheckIn.date == today))
    if not row:
        row = DailyCheckIn(date=today, timestamp=int(datetime.utcnow().timestamp() * 1000), emotional_state=payload.emotionalState, energy_level=payload.energyLevel, one_word=payload.oneWord)
        db.add(row)
    else:
        row.timestamp = int(datetime.utcnow().timestamp() * 1000)
        row.emotional_state = payload.emotionalState
        row.energy_level = payload.energyLevel
        row.one_word = payload.oneWord
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.get("/streak")
def get_checkin_streak(db: Session = Depends(get_db)) -> dict:
    rows = db.scalars(select(DailyCheckIn).order_by(DailyCheckIn.date.desc())).all()
    streak = 0
    expected = date.today()
    for row in rows:
        if row.date == expected:
            streak += 1
            expected = expected.fromordinal(expected.toordinal() - 1)
        elif row.date < expected:
            break
    return {"streak": streak}
