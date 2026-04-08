from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class RelationshipScreenshotImport(Base):
    __tablename__ = "relationship_screenshot_imports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(40), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    matched_person_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    detected_labels: Mapped[list[str]] = mapped_column(JSON, default=list)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
