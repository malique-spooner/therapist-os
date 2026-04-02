from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import NutritionLog
from ..schemas.nutrition import NutritionCreateSchema
from ..services.periods import date_window

router = APIRouter(prefix="/nutrition", tags=["nutrition"], dependencies=[Depends(verify_api_key)])


def _serialize(row: NutritionLog) -> dict:
    return {
        "date": row.date.isoformat(),
        "meals": {
            "breakfast": row.breakfast,
            "lunch": row.lunch,
            "dinner": row.dinner,
            "heavySnacking": row.heavy_snacking,
        },
        "foodQuality": row.food_quality or 2,
        "caffeine": {
            "count": row.caffeine_count,
            "lastBeforeNoon": True if row.caffeine_last_before_noon is None else row.caffeine_last_before_noon,
        },
        "alcohol": {"units": row.alcohol_units},
    }


def _upsert(target_date: date, payload: NutritionCreateSchema, db: Session) -> NutritionLog:
    row = db.scalar(select(NutritionLog).where(NutritionLog.date == target_date))
    if not row:
        row = NutritionLog(date=target_date)
        db.add(row)

    row.breakfast = bool(payload.meals.get("breakfast"))
    row.lunch = bool(payload.meals.get("lunch"))
    row.dinner = bool(payload.meals.get("dinner"))
    row.heavy_snacking = bool(payload.meals.get("heavySnacking"))
    row.food_quality = int(payload.foodQuality)
    row.caffeine_count = int(payload.caffeine.get("count", 0))
    row.caffeine_last_before_noon = bool(payload.caffeine.get("lastBeforeNoon", True))
    row.alcohol_units = int(payload.alcohol.get("units", 0))
    db.commit()
    db.refresh(row)
    return row


@router.get("")
def get_nutrition(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(select(NutritionLog).where(NutritionLog.date.between(start, end)).order_by(NutritionLog.date)).all()
    return [_serialize(row) for row in rows]


@router.get("/today")
def get_nutrition_today(db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(NutritionLog).order_by(NutritionLog.date.desc()))
    if row:
        return _serialize(row)
    return {
        "date": date.today().isoformat(),
        "meals": {"breakfast": False, "lunch": False, "dinner": False, "heavySnacking": False},
        "foodQuality": 2,
        "caffeine": {"count": 0, "lastBeforeNoon": True},
        "alcohol": {"units": 0},
    }


@router.post("/today")
def save_nutrition_today(payload: NutritionCreateSchema, db: Session = Depends(get_db)) -> dict:
    return _serialize(_upsert(date.today(), payload, db))


@router.put("/today")
def update_nutrition_today(payload: NutritionCreateSchema, db: Session = Depends(get_db)) -> dict:
    return _serialize(_upsert(date.today(), payload, db))
