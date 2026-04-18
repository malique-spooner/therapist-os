from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import FinanceDataReal, MonthlyBudgetReal
from ..schemas.profile import BudgetSchema, BudgetUpdateSchema, ProfileSchema
from ..services.profile_service import ProfileService

router = APIRouter(tags=["profile"], dependencies=[Depends(verify_api_key)])
profile_service = ProfileService()


@router.get("/profile", response_model=ProfileSchema)
async def get_profile(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    if not profile_service.has_profile_inputs(db, mode):
        return profile_service.empty_profile_payload()
    profile = await profile_service.update_profile(db, mode)
    return {
        "profileDocument": profile.profile_document,
        "keyThemes": profile.key_themes or [],
        "activeGoals": profile.active_goals or [],
        "notablePatterns": profile.notable_patterns or [],
    }


@router.get("/profile/themes")
async def get_profile_themes(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    if not profile_service.has_profile_inputs(db, mode):
        return {"themes": []}
    profile = await profile_service.update_profile(db, mode)
    return {"themes": profile.key_themes or []}


@router.get("/profile/patterns")
async def get_profile_patterns(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    if not profile_service.has_profile_inputs(db, mode):
        return {"patterns": []}
    profile = await profile_service.update_profile(db, mode)
    return {"patterns": profile.notable_patterns or []}


@router.post("/profile/refresh", response_model=ProfileSchema)
async def refresh_profile(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    profile = await profile_service.update_profile(db, mode)
    return {
        "profileDocument": profile.profile_document,
        "keyThemes": profile.key_themes or [],
        "activeGoals": profile.active_goals or [],
        "notablePatterns": profile.notable_patterns or [],
    }


def _current_budget(db: Session, mode: str | None = None):
    month = date.today().replace(day=1)
    budget = db.scalar(select(MonthlyBudgetReal).where(MonthlyBudgetReal.month == month))
    if not budget:
        budget = MonthlyBudgetReal(month=month)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget


@router.get("/budget/current", response_model=BudgetSchema)
def get_budget(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    budget = _current_budget(db, mode)
    month_end = date(budget.month.year + (1 if budget.month.month == 12 else 0), 1 if budget.month.month == 12 else budget.month.month + 1, 1)
    spent_pence = (
        db.scalar(
            select(func.coalesce(func.sum(finance_model.amount_pence), 0)).where(
                FinanceDataReal.date >= budget.month,
                FinanceDataReal.date < month_end,
            )
        )
        or 0
    )
    return {
        "month": budget.month.isoformat(),
        "limitPence": budget.limit_pence,
        "spentPence": spent_pence,
        "autoSwitchAt80": budget.auto_switch_at_80,
        "disablePaidAtLimit": budget.disable_paid_at_limit,
    }


@router.put("/budget", response_model=BudgetSchema)
def update_budget(payload: BudgetUpdateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    budget = _current_budget(db, mode)
    budget.limit_pence = payload.limitPence
    budget.auto_switch_at_80 = payload.autoSwitchAt80
    budget.disable_paid_at_limit = payload.disablePaidAtLimit
    db.commit()
    db.refresh(budget)
    return {
        "month": budget.month.isoformat(),
        "limitPence": budget.limit_pence,
        "spentPence": budget.spent_pence,
        "autoSwitchAt80": budget.auto_switch_at_80,
        "disablePaidAtLimit": budget.disable_paid_at_limit,
    }
