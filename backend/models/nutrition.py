from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    breakfast: Mapped[bool] = mapped_column(Boolean, default=False)
    lunch: Mapped[bool] = mapped_column(Boolean, default=False)
    dinner: Mapped[bool] = mapped_column(Boolean, default=False)
    heavy_snacking: Mapped[bool] = mapped_column(Boolean, default=False)
    food_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)
    caffeine_count: Mapped[int] = mapped_column(Integer, default=0)
    caffeine_last_before_noon: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    alcohol_units: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
