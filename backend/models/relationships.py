import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))
    tier: Mapped[str] = mapped_column(String(20))
    desired_frequency_days: Mapped[int] = mapped_column(Integer)
    avatar_colour: Mapped[str | None] = mapped_column(String(7), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RelationshipInteraction(Base):
    __tablename__ = "relationship_interactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date: Mapped[date] = mapped_column(Date, index=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)
    person_ids: Mapped[list[str]] = mapped_column(JSON)
    interaction_type: Mapped[str] = mapped_column(String(50))
    presence_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feeling_word: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
