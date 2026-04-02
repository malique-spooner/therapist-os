from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..schemas.dashboard import DashboardResponseSchema
from ..services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(verify_api_key)])
service = DashboardService()


@router.get("", response_model=DashboardResponseSchema)
def get_dashboard(period: str = "this-week", db: Session = Depends(get_db)) -> dict:
    return service.build_dashboard(db, period)
