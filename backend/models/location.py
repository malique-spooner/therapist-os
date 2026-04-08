from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class LocationData(Base):
    __tablename__ = "location_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LocationDailySummary(Base):
    __tablename__ = "location_daily_summary"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    home_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    gym_visits: Mapped[int] = mapped_column(Integer, default=0)
    social_venue_visits: Mapped[int] = mapped_column(Integer, default=0)
    new_places_visited: Mapped[int] = mapped_column(Integer, default=0)
    commute_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    time_outdoors_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
