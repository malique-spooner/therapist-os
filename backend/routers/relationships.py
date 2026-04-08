from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import (
    RelationshipDemo,
    RelationshipInteractionDemo,
    RelationshipInteractionReal,
    RelationshipReal,
    RelationshipScreenshotImportDemo,
    RelationshipScreenshotImportReal,
)
from ..schemas.relationships import RelationshipCreateSchema, RelationshipInteractionCreateSchema, RelationshipScreenshotImportSchema
from ..services.data_mode import dataset_model
from ..services.periods import date_window

router = APIRouter(prefix="/relationships", tags=["relationships"], dependencies=[Depends(verify_api_key)])


TIER_COLOURS = {
    "inner": "#2D6A4F",
    "middle": "#52B788",
    "outer": "#B7E4C7",
}


def _serialize_person(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "type": row.type,
        "tier": row.tier,
        "desiredFrequencyDays": row.desired_frequency_days,
        "avatarColour": row.avatar_colour,
    }


def _serialize_interaction(row) -> dict:
    return {
        "id": row.id,
        "date": row.date.isoformat(),
        "timestamp": row.timestamp,
        "personIds": row.person_ids or [],
        "type": row.interaction_type,
        "presenceScore": row.presence_score,
        "feelingWord": row.feeling_word,
    }


def _serialize_import(row) -> dict:
    return {
        "id": row.id,
        "source": row.source,
        "filename": row.filename,
        "mimeType": row.mime_type,
        "fileSizeBytes": row.file_size_bytes,
        "capturedAt": row.captured_at.isoformat() if row.captured_at else None,
        "matchedPersonIds": row.matched_person_ids or [],
        "detectedLabels": row.detected_labels or [],
        "note": row.note,
        "importedAt": row.imported_at.isoformat(),
    }


@router.get("")
def get_relationships(mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    relationship_model = dataset_model(mode, RelationshipReal, RelationshipDemo)
    rows = db.scalars(
        select(relationship_model)
        .where(relationship_model.active.is_(True))
        .order_by(relationship_model.created_at)
    ).all()
    return [_serialize_person(row) for row in rows]


@router.post("")
def create_relationship(payload: RelationshipCreateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    relationship_model = dataset_model(mode or "real-only", RelationshipReal, RelationshipDemo)
    row = relationship_model(
        id=str(uuid.uuid4()),
        name=payload.name,
        type=payload.type,
        tier=payload.tier,
        desired_frequency_days=payload.desiredFrequencyDays,
        avatar_colour=TIER_COLOURS.get(payload.tier, "#52B788"),
        active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_person(row)


@router.get("/interactions")
def get_relationship_interactions(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    interaction_model = dataset_model(mode, RelationshipInteractionReal, RelationshipInteractionDemo)
    rows = db.scalars(
        select(interaction_model)
        .where(interaction_model.date.between(start, end))
        .order_by(interaction_model.timestamp)
    ).all()
    return [_serialize_interaction(row) for row in rows]


@router.post("/interactions")
def create_relationship_interaction(payload: RelationshipInteractionCreateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    now = datetime.utcnow()
    target_date = datetime.fromisoformat(payload.date).date() if payload.date else now.date()
    timestamp = int(now.timestamp() * 1000)
    if payload.date:
        target_timestamp = datetime.combine(target_date, now.time())
        timestamp = int(target_timestamp.timestamp() * 1000)
    interaction_model = dataset_model(mode or "real-only", RelationshipInteractionReal, RelationshipInteractionDemo)
    row = interaction_model(
        id=str(uuid.uuid4()),
        date=target_date,
        timestamp=timestamp,
        person_ids=payload.personIds,
        interaction_type=payload.type,
        presence_score=payload.presenceScore,
        feeling_word=payload.feelingWord,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_interaction(row)


@router.delete("/interactions/{interaction_id}")
def delete_relationship_interaction(interaction_id: str, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    interaction_model = dataset_model(mode or "real-only", RelationshipInteractionReal, RelationshipInteractionDemo)
    row = db.get(interaction_model, interaction_id)
    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(row)
    db.commit()
    return {"detail": "Interaction deleted"}


@router.get("/due")
def get_due_relationships(mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    relationship_model = dataset_model(mode, RelationshipReal, RelationshipDemo)
    interaction_model = dataset_model(mode, RelationshipInteractionReal, RelationshipInteractionDemo)
    people = db.scalars(select(relationship_model).where(relationship_model.active.is_(True))).all()
    interactions = db.scalars(
        select(interaction_model)
        .order_by(interaction_model.timestamp)
    ).all()
    last_by_person: dict[str, object] = {}
    for interaction in interactions:
        for person_id in interaction.person_ids or []:
            last_by_person[person_id] = interaction

    now = datetime.utcnow().date()
    due = []
    for person in people:
        last = last_by_person.get(person.id)
        days_ago = (now - last.date).days if last else person.desired_frequency_days + 1
        if days_ago >= person.desired_frequency_days:
            due.append(
                {
                    "person": _serialize_person(person),
                    "daysAgo": days_ago,
                }
            )
    due.sort(key=lambda item: item["daysAgo"], reverse=True)
    return due


@router.get("/imports")
def get_relationship_imports(mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    import_model = dataset_model(mode or "real-only", RelationshipScreenshotImportReal, RelationshipScreenshotImportDemo)
    rows = db.scalars(
        select(import_model)
        .order_by(import_model.imported_at.desc())
    ).all()
    return [_serialize_import(row) for row in rows]


@router.post("/imports/snapchat", response_model=RelationshipScreenshotImportSchema)
async def import_snapchat_best_friends_screenshot(
    screenshot: UploadFile = File(...),
    capturedAt: str | None = Form(default=None),
    matchedPersonIds: str = Form(default=""),
    detectedLabels: str = Form(default=""),
    note: str | None = Form(default=None),
    mode: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    content = await screenshot.read()
    matched_ids = [item.strip() for item in matchedPersonIds.split(",") if item.strip()]
    labels = [item.strip() for item in detectedLabels.split(",") if item.strip()]
    captured_at = datetime.fromisoformat(capturedAt) if capturedAt else None

    import_model = dataset_model(mode or "real-only", RelationshipScreenshotImportReal, RelationshipScreenshotImportDemo)
    row = import_model(
        source="snapchat_best_friends",
        filename=screenshot.filename or "snapchat-best-friends.png",
        mime_type=screenshot.content_type,
        file_size_bytes=len(content) if content is not None else None,
        captured_at=captured_at,
        matched_person_ids=matched_ids,
        detected_labels=labels,
        note=note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_import(row)
