from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class FinanceData(Base):
    __tablename__ = "finance_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    amount_pence: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(50), index=True)
    merchant: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
