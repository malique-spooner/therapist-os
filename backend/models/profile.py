from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile_document: Mapped[str] = mapped_column(Text)
    last_therapy_session: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    key_themes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    active_goals: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    important_relationships: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    health_baseline: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mood_baseline: Mapped[float | None] = mapped_column(Float, nullable=True)
    notable_patterns: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)


class MonthlyBudget(Base):
    __tablename__ = "monthly_budget"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    month: Mapped[date] = mapped_column(Date, unique=True, index=True)
    limit_pence: Mapped[int] = mapped_column(Integer, default=1000)
    spent_pence: Mapped[int] = mapped_column(Integer, default=0)
    auto_switch_at_80: Mapped[bool] = mapped_column(Boolean, default=True)
    disable_paid_at_limit: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
