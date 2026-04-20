from __future__ import annotations

import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models import RawDataImport, RawImportRow
from ...models.life_data import FinanceDataReal
from .google_drive_importer import DriveFileRef, GoogleDriveImportService


SPEND_TYPES = {"Card Payment", "Fee", "Transfer", "ATM", "C/L", "D/D", "S/O", "DPC", "IBP", "POS", "PURCHASE"}
INCOME_TYPES = {"Topup", "Card Refund", "BAC", "INT", "TFR", "PAYMENT"}


class FinanceImportService:
    def __init__(self) -> None:
        self._drive_imports = GoogleDriveImportService()

    async def sync_last_30_days(self, db: Session) -> list[Any]:
        raise RuntimeError("Finance sync now uses Revolut and NatWest file imports.")

    def import_csv_text(self, source_id: str, file_ref: DriveFileRef, csv_text: str, db: Session) -> dict[str, int]:
        if source_id not in {"revolut", "natwest"}:
            raise RuntimeError("Unsupported finance source")

        import_record = self._drive_imports.record_discovered_file(file_ref, db)
        rows = list(csv.DictReader(io.StringIO(csv_text)))
        raw_count = 0
        clean_count = 0
        skipped_count = 0

        for index, raw_row in enumerate(rows, start=1):
            normalized = self._normalize_row(source_id, raw_row)
            raw_record = self._upsert_raw_row(import_record, source_id, index, raw_row, normalized, db)
            raw_count += 1
            if not normalized:
                raw_record.status = "skipped"
                skipped_count += 1
                continue
            if normalized["amount_pence"] <= 0:
                raw_record.status = "normalized"
                skipped_count += 1
                continue
            self._upsert_finance_row(source_id, raw_record, normalized, db)
            raw_record.status = "cleaned"
            clean_count += 1

        import_record.status = "parsed"
        import_record.parsed_at = datetime.utcnow()
        db.commit()
        return {"raw_rows": raw_count, "clean_rows": clean_count, "skipped_rows": skipped_count}

    def _normalize_row(self, source_id: str, raw_row: dict[str, str]) -> dict[str, Any] | None:
        return self._normalize_revolut(raw_row) if source_id == "revolut" else self._normalize_natwest(raw_row)

    def _normalize_revolut(self, raw_row: dict[str, str]) -> dict[str, Any] | None:
        state = raw_row.get("State", "").strip()
        if state and state != "COMPLETED":
            return None
        amount = self._decimal(raw_row.get("Amount"))
        if amount is None:
            return None
        completed = self._parse_datetime(raw_row.get("Completed Date")) or self._parse_datetime(raw_row.get("Started Date"))
        if not completed:
            return None
        tx_type = raw_row.get("Type", "").strip()
        merchant = raw_row.get("Description", "").strip()
        spend_pence = self._spend_pence(amount, tx_type)
        return {
            "date": completed.date().isoformat(),
            "amount_pence": spend_pence,
            "category": self._category(merchant, tx_type),
            "merchant": merchant or None,
            "description": merchant or None,
            "bank_name": "Revolut",
            "account_name": raw_row.get("Product") or "Current",
            "account_ref": raw_row.get("Currency") or None,
            "source_type": tx_type or None,
        }

    def _normalize_natwest(self, raw_row: dict[str, str]) -> dict[str, Any] | None:
        amount = self._decimal(raw_row.get("Value"))
        if amount is None:
            return None
        parsed_date = self._parse_natwest_date(raw_row.get("Date"))
        if not parsed_date:
            return None
        tx_type = raw_row.get("Type", "").strip()
        description = raw_row.get("Description", "").strip()
        account_number = raw_row.get("Account Number", "").strip()
        spend_pence = self._spend_pence(amount, tx_type)
        return {
            "date": parsed_date.date().isoformat(),
            "amount_pence": spend_pence,
            "category": self._category(description, tx_type),
            "merchant": self._merchant_from_description(description),
            "description": description or None,
            "bank_name": "NatWest",
            "account_name": raw_row.get("Account Name") or None,
            "account_ref": account_number or None,
            "source_type": tx_type or None,
        }

    @staticmethod
    def _upsert_raw_row(
        import_record: RawDataImport,
        source_id: str,
        row_index: int,
        raw_row: dict[str, str],
        normalized: dict[str, Any] | None,
        db: Session,
    ) -> RawImportRow:
        row_hash = hashlib.sha256(json.dumps(raw_row, sort_keys=True).encode("utf-8")).hexdigest()
        record = db.scalar(
            select(RawImportRow).where(
                RawImportRow.import_id == import_record.id,
                RawImportRow.row_hash == row_hash,
            )
        )
        if record is None:
            record = RawImportRow(
                import_id=import_record.id,
                source_id=source_id,
                row_index=row_index,
                row_hash=row_hash,
                raw_payload=raw_row,
            )
            db.add(record)
        record.raw_payload = raw_row
        record.normalized_payload = normalized
        record.error = None
        db.flush()
        return record

    @staticmethod
    def _upsert_finance_row(source_id: str, raw_record: RawImportRow, normalized: dict[str, Any], db: Session) -> FinanceDataReal:
        transaction_id = f"{source_id}:{raw_record.row_hash}"
        record = db.scalar(select(FinanceDataReal).where(FinanceDataReal.transaction_id == transaction_id))
        if record is None:
            record = FinanceDataReal(transaction_id=transaction_id)
            db.add(record)
        record.date = datetime.fromisoformat(normalized["date"]).date()
        record.amount_pence = normalized["amount_pence"]
        record.category = normalized["category"]
        record.merchant = normalized.get("merchant")
        record.description = normalized.get("description")
        record.bank_name = normalized.get("bank_name")
        record.account_name = normalized.get("account_name")
        record.account_ref = normalized.get("account_ref")
        record.source_type = normalized.get("source_type")
        db.flush()
        return record

    @staticmethod
    def _decimal(value: str | None) -> Decimal | None:
        if value in (None, ""):
            return None
        try:
            return Decimal(str(value).replace(",", "").strip())
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
        return None

    @staticmethod
    def _parse_natwest_date(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.strptime(value.strip(), "%d %b %Y")
        except ValueError:
            return None

    @staticmethod
    def _spend_pence(amount: Decimal, tx_type: str) -> int:
        tx_type = tx_type.strip()
        if amount < 0:
            return int(abs(amount) * 100)
        if tx_type in INCOME_TYPES:
            return -int(amount * 100)
        return int(amount * 100)

    @staticmethod
    def _merchant_from_description(description: str) -> str | None:
        parts = [part.strip() for part in description.split(",") if part.strip()]
        if not parts:
            return None
        return parts[1] if parts and parts[0].isdigit() and len(parts) > 1 else parts[0]

    @staticmethod
    def _category(text: str, tx_type: str) -> str:
        haystack = f"{text} {tx_type}".lower()
        if any(token in haystack for token in ("tesco", "sainsbury", "lidl", "morrisons", "grocery", "supermarket", "publix", "walmart", "iceland")):
            return "groceries"
        if any(token in haystack for token in ("tfl", "trainline", "uber", "lyft", "voi", "lime", "easyjet", "ryanair", "santander cycles")):
            return "transport"
        if any(token in haystack for token in ("mcdonald", "kfc", "gregg", "pizza", "restaurant", "cafe", "burger", "subway", "chick-fil-a", "pret")):
            return "eating_out"
        if any(token in haystack for token in ("pub", "bar", "club", "eventbrite", "dice", "theatre", "cinema", "tickets")):
            return "social"
        if any(token in haystack for token in ("spotify", "netflix", "audible", "openai", "claude", "apple.com/bill", "adobe", "elevenlabs", "cloudflare")):
            return "entertainment"
        return "other"
