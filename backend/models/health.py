from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class HealthData(Base):
    __tablename__ = "health_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    steps: Mapped[int | None] = mapped_column(Integer, default=0)
    sleep_duration_hours: Mapped[float | None] = mapped_column(Float, default=0)
    sleep_quality: Mapped[float | None] = mapped_column(Float, default=0)
    hrv_ms: Mapped[float | None] = mapped_column(Float, default=0)
    resting_hr: Mapped[int | None] = mapped_column(Integer, default=0)
    workout_logged: Mapped[bool] = mapped_column(Boolean, default=False)
    workout_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    workout_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
