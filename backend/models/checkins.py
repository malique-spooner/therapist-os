from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)
    emotional_state: Mapped[int] = mapped_column(Integer)
    energy_level: Mapped[int] = mapped_column(Integer)
    one_word: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
