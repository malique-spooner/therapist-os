from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import FinanceDataReal
from ..services.periods import date_window

router = APIRouter(prefix="/finance", tags=["finance"], dependencies=[Depends(verify_api_key)])


def _serialize_day(day: str, categories: dict[str, int], bank_breakdown: dict[str, dict[str, int]]) -> dict:
    return {
        "date": day,
        "totalSpend": sum(categories.values()),
        "eatingOut": categories.get("eating_out", 0),
        "groceries": categories.get("groceries", 0),
        "transport": categories.get("transport", 0),
        "entertainment": categories.get("entertainment", 0),
        "social": categories.get("social", 0),
        "other": categories.get("other", 0),
        "bankBreakdown": [
            {
                "name": bank_name,
                "totalSpend": sum(bank_categories.values()),
                "eatingOut": bank_categories.get("eating_out", 0),
                "groceries": bank_categories.get("groceries", 0),
                "transport": bank_categories.get("transport", 0),
                "entertainment": bank_categories.get("entertainment", 0),
                "social": bank_categories.get("social", 0),
                "other": bank_categories.get("other", 0),
            }
            for bank_name, bank_categories in sorted(bank_breakdown.items())
        ],
    }


@router.get("")
def get_finance(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(
        select(FinanceDataReal)
        .where(FinanceDataReal.date.between(start, end))
        .order_by(FinanceDataReal.date)
    ).all()
    by_date: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    by_date_bank: dict[str, dict[str, dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    for row in rows:
        by_date[row.date.isoformat()][row.category] += round(row.amount_pence / 100)
        bank_name = row.bank_name or "Imported account"
        by_date_bank[row.date.isoformat()][bank_name][row.category] += round(row.amount_pence / 100)
    payload = []
    for day in sorted(by_date):
        categories = by_date[day]
        payload.append(_serialize_day(day, categories, by_date_bank[day]))
    return payload


@router.get("/today")
def get_finance_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    latest = db.scalar(select(FinanceDataReal.date).order_by(FinanceDataReal.date.desc()))
    if latest is None:
        raise HTTPException(status_code=404, detail="Finance data not available")
    rows = db.scalars(select(FinanceDataReal).where(FinanceDataReal.date == latest)).all()
    categories: dict[str, int] = defaultdict(int)
    bank_breakdown: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in rows:
        categories[row.category] += round(row.amount_pence / 100)
        bank_name = row.bank_name or "Imported account"
        bank_breakdown[bank_name][row.category] += round(row.amount_pence / 100)
    return _serialize_day(latest.isoformat(), categories, bank_breakdown)


@router.post("/sync")
async def sync_finance(db: Session = Depends(get_db)) -> dict:
    raise HTTPException(status_code=400, detail="Finance sync now uses Revolut and NatWest file imports.")
