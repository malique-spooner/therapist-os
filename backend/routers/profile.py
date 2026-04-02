from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import MonthlyBudget, UserProfile
from ..schemas.profile import BudgetSchema, BudgetUpdateSchema, ProfileSchema
from ..services.profile_service import ProfileService

router = APIRouter(tags=["profile"], dependencies=[Depends(verify_api_key)])
profile_service = ProfileService()


@router.get("/profile", response_model=ProfileSchema)
def get_profile(db: Session = Depends(get_db)) -> dict:
    profile = db.scalar(select(UserProfile).limit(1))
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "profileDocument": profile.profile_document,
        "keyThemes": profile.key_themes or [],
        "activeGoals": profile.active_goals or [],
        "notablePatterns": profile.notable_patterns or [],
    }


@router.get("/profile/themes")
def get_profile_themes(db: Session = Depends(get_db)) -> dict:
    profile = db.scalar(select(UserProfile).limit(1))
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"themes": profile.key_themes or []}


@router.get("/profile/patterns")
def get_profile_patterns(db: Session = Depends(get_db)) -> dict:
    profile = db.scalar(select(UserProfile).limit(1))
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"patterns": profile.notable_patterns or []}


@router.post("/profile/refresh", response_model=ProfileSchema)
async def refresh_profile(db: Session = Depends(get_db)) -> dict:
    profile = await profile_service.update_profile(db)
    return {
        "profileDocument": profile.profile_document,
        "keyThemes": profile.key_themes or [],
        "activeGoals": profile.active_goals or [],
        "notablePatterns": profile.notable_patterns or [],
    }


def _current_budget(db: Session) -> MonthlyBudget:
    month = date.today().replace(day=1)
    budget = db.scalar(select(MonthlyBudget).where(MonthlyBudget.month == month))
    if not budget:
        budget = MonthlyBudget(month=month)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget


@router.get("/budget/current", response_model=BudgetSchema)
def get_budget(db: Session = Depends(get_db)) -> dict:
    budget = _current_budget(db)
    return {
        "month": budget.month.isoformat(),
        "limitPence": budget.limit_pence,
        "spentPence": budget.spent_pence,
        "autoSwitchAt80": budget.auto_switch_at_80,
        "disablePaidAtLimit": budget.disable_paid_at_limit,
    }


@router.put("/budget", response_model=BudgetSchema)
def update_budget(payload: BudgetUpdateSchema, db: Session = Depends(get_db)) -> dict:
    budget = _current_budget(db)
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
