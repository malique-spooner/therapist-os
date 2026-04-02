from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import FinanceData
from ..services.data_sources import DataSourceService
from ..services.ingestion.truelayer import TrueLayerIngestionService
from ..services.periods import date_window

router = APIRouter(prefix="/finance", tags=["finance"], dependencies=[Depends(verify_api_key)])
service = TrueLayerIngestionService()
data_source_service = DataSourceService()


def _serialize_day(day: str, categories: dict[str, int]) -> dict:
    return {
        "date": day,
        "totalSpend": sum(categories.values()),
        "eatingOut": categories.get("eating_out", 0),
        "groceries": categories.get("groceries", 0),
        "transport": categories.get("transport", 0),
        "entertainment": categories.get("entertainment", 0),
        "social": categories.get("social", 0),
        "other": categories.get("other", 0),
    }


@router.get("")
def get_finance(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(select(FinanceData).where(FinanceData.date.between(start, end)).order_by(FinanceData.date)).all()
    by_date: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in rows:
        by_date[row.date.isoformat()][row.category] += round(row.amount_pence / 100)
    payload = []
    for day in sorted(by_date):
        categories = by_date[day]
        payload.append(_serialize_day(day, categories))
    return payload


@router.get("/today")
def get_finance_today(db: Session = Depends(get_db)) -> dict:
    latest = db.scalar(select(FinanceData.date).order_by(FinanceData.date.desc()))
    if latest is None:
        raise HTTPException(status_code=404, detail="Finance data not available")
    rows = db.scalars(select(FinanceData).where(FinanceData.date == latest)).all()
    categories: dict[str, int] = defaultdict(int)
    for row in rows:
        categories[row.category] += round(row.amount_pence / 100)
    return _serialize_day(latest.isoformat(), categories)


@router.post("/sync")
async def sync_finance(db: Session = Depends(get_db)) -> dict:
    try:
        records = await service.sync_last_30_days(db)
    except RuntimeError as exc:
        data_source_service.mark_sync_result("truelayer", success=False, db=db, error=str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    data_source_service.mark_sync_result("truelayer", success=True, db=db)
    return {
        "detail": "Finance synced",
        "transactionsSynced": len(records),
    }
