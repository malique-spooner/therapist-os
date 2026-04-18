from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Float, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class WeatherData(Base):
    __tablename__ = "weather_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    sunrise_time: Mapped[time] = mapped_column(Time)
    sunset_time: Mapped[time] = mapped_column(Time)
    daylight_hours: Mapped[float] = mapped_column(Float)
    temperature_high_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature_low_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uv_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
