from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import Relationship, RelationshipInteraction
from ..schemas.relationships import RelationshipCreateSchema, RelationshipInteractionCreateSchema
from ..services.periods import date_window

router = APIRouter(prefix="/relationships", tags=["relationships"], dependencies=[Depends(verify_api_key)])


TIER_COLOURS = {
    "inner": "#2D6A4F",
    "middle": "#52B788",
    "outer": "#B7E4C7",
}


def _serialize_person(row: Relationship) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "type": row.type,
        "tier": row.tier,
        "desiredFrequencyDays": row.desired_frequency_days,
        "avatarColour": row.avatar_colour,
    }


def _serialize_interaction(row: RelationshipInteraction) -> dict:
    return {
        "id": row.id,
        "date": row.date.isoformat(),
        "timestamp": row.timestamp,
        "personIds": row.person_ids or [],
        "type": row.interaction_type,
        "presenceScore": row.presence_score,
        "feelingWord": row.feeling_word,
    }


@router.get("")
def get_relationships(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Relationship).where(Relationship.active.is_(True)).order_by(Relationship.created_at)).all()
    return [_serialize_person(row) for row in rows]


@router.post("")
def create_relationship(payload: RelationshipCreateSchema, db: Session = Depends(get_db)) -> dict:
    row = Relationship(
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
def get_relationship_interactions(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(
        select(RelationshipInteraction)
        .where(RelationshipInteraction.date.between(start, end))
        .order_by(RelationshipInteraction.timestamp)
    ).all()
    return [_serialize_interaction(row) for row in rows]


@router.post("/interactions")
def create_relationship_interaction(payload: RelationshipInteractionCreateSchema, db: Session = Depends(get_db)) -> dict:
    now = datetime.utcnow()
    row = RelationshipInteraction(
        id=str(uuid.uuid4()),
        date=now.date(),
        timestamp=int(now.timestamp() * 1000),
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
def delete_relationship_interaction(interaction_id: str, db: Session = Depends(get_db)) -> dict:
    row = db.get(RelationshipInteraction, interaction_id)
    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(row)
    db.commit()
    return {"detail": "Interaction deleted"}


@router.get("/due")
def get_due_relationships(db: Session = Depends(get_db)) -> list[dict]:
    people = db.scalars(select(Relationship).where(Relationship.active.is_(True))).all()
    interactions = db.scalars(select(RelationshipInteraction).order_by(RelationshipInteraction.timestamp)).all()
    last_by_person: dict[str, RelationshipInteraction] = {}
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
