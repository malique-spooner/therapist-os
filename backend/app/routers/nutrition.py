from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import NutritionLogReal
from ..schemas.nutrition import NutritionCreateSchema
from ..services.periods import date_window

router = APIRouter(prefix="/nutrition", tags=["nutrition"], dependencies=[Depends(verify_api_key)])


def _serialize(row) -> dict:
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


def _upsert(target_date: date_type, payload: NutritionCreateSchema, db: Session, mode: str | None) -> NutritionLogReal:
    row = db.scalar(select(NutritionLogReal).where(NutritionLogReal.date == target_date))
    if not row:
        row = NutritionLogReal(date=target_date)
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
def get_nutrition(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(
        select(NutritionLogReal)
        .where(NutritionLogReal.date.between(start, end))
        .order_by(NutritionLogReal.date)
    ).all()
    return [_serialize(row) for row in rows]


@router.get("/today")
def get_nutrition_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(NutritionLogReal).order_by(NutritionLogReal.date.desc()))
    if row:
        return _serialize(row)
    return {
        "date": date_type.today().isoformat(),
        "meals": {"breakfast": False, "lunch": False, "dinner": False, "heavySnacking": False},
        "foodQuality": 2,
        "caffeine": {"count": 0, "lastBeforeNoon": True},
        "alcohol": {"units": 0},
    }


@router.get("/day")
def get_nutrition_for_date(date: str, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    target_date = date_type.fromisoformat(date)
    row = db.scalar(select(NutritionLogReal).where(NutritionLogReal.date == target_date))
    if row:
        return _serialize(row)
    return {
        "date": target_date.isoformat(),
        "meals": {"breakfast": False, "lunch": False, "dinner": False, "heavySnacking": False},
        "foodQuality": 2,
        "caffeine": {"count": 0, "lastBeforeNoon": True},
        "alcohol": {"units": 0},
    }


@router.post("/today")
def save_nutrition_today(payload: NutritionCreateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    return _serialize(_upsert(date_type.today(), payload, db, mode))


@router.put("/today")
def update_nutrition_today(payload: NutritionCreateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    return _serialize(_upsert(date_type.today(), payload, db, mode))


@router.put("/day")
def update_nutrition_for_date(date: str, payload: NutritionCreateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    target_date = date_type.fromisoformat(date)
    return _serialize(_upsert(target_date, payload, db, mode))
