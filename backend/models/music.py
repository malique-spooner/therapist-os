from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class MusicData(Base):
    __tablename__ = "music_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    listening_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_valence: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_danceability: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_discoveries: Mapped[int] = mapped_column(Integer, default=0)
    top_genres: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    top_tracks: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
