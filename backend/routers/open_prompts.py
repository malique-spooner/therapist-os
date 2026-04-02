from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..services.open_prompt_service import OpenPromptService

router = APIRouter(prefix="/open-prompts", tags=["open-prompts"], dependencies=[Depends(verify_api_key)])
service = OpenPromptService()


@router.get("/current")
def get_current_prompt(db: Session = Depends(get_db)) -> dict | None:
    return service.get_current_prompt(db)


@router.post("/{prompt_key}/dismiss")
def dismiss_prompt(prompt_key: str, db: Session = Depends(get_db)) -> dict:
    service.dismiss_prompt(prompt_key, db)
    return {"detail": "Prompt dismissed"}


@router.post("/{prompt_key}/complete")
def complete_prompt(prompt_key: str, db: Session = Depends(get_db)) -> dict:
    service.complete_prompt(prompt_key, db)
    return {"detail": "Prompt completed"}
