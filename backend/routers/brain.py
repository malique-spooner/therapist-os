from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..schemas.brain import BrainPayloadSchema
from ..services.brain import BrainService

router = APIRouter(prefix="/brain", tags=["brain"], dependencies=[Depends(verify_api_key)])
service = BrainService()


@router.get("", response_model=BrainPayloadSchema)
def get_brain_payload(db: Session = Depends(get_db)) -> dict:
    return service.get_payload(db)
