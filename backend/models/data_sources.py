from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class DataSourceConnection(Base):
    __tablename__ = "data_source_connections"

    source_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(200), nullable=False)
    connected: Mapped[bool] = mapped_column(Boolean, default=False)
    available: Mapped[bool] = mapped_column(Boolean, default=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    connection_hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
