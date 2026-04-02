import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    session_type: Mapped[str] = mapped_column(String(20), default="async")
    ai_provider: Mapped[str] = mapped_column(String(50))
    ai_model: Mapped[str] = mapped_column(String(100))
    total_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_pence: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    messages: Mapped[list["AIMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(ForeignKey("ai_conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_pence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frameworks_referenced: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    conversation: Mapped[AIConversation] = relationship(back_populates="messages")
