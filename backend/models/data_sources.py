from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    encrypted_config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sync_attempts: Mapped[list["DataSourceSyncAttempt"]] = relationship(
        back_populates="source",
        cascade="all, delete-orphan",
        order_by="desc(DataSourceSyncAttempt.attempted_at)",
    )


class DataSourceSyncAttempt(Base):
    __tablename__ = "data_source_sync_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("data_source_connections.source_id"), index=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
    trigger: Mapped[str] = mapped_column(String(30), default="manual")
    data_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rows_synced: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    cooldown_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    source: Mapped[DataSourceConnection] = relationship(back_populates="sync_attempts")
