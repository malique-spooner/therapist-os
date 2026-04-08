from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...core.logging import get_logger
from ...models.life_data import FinanceDataReal

logger = get_logger(__name__)


class TrueLayerIngestionService:
    BASE_URL = "https://api.truelayer.com"
    AUTH_URL = "https://auth.truelayer.com/connect/token"

    def __init__(self, config: dict[str, str] | None = None) -> None:
        self._config = config or {}

    @property
    def is_configured(self) -> bool:
        return bool(self._client_id and self._client_secret and self._refresh_token)

    @property
    def _client_id(self) -> str:
        return self._config.get("client_id") or settings.TRUELAYER_CLIENT_ID

    @property
    def _client_secret(self) -> str:
        return self._config.get("client_secret") or settings.TRUELAYER_CLIENT_SECRET

    @property
    def _access_token(self) -> str:
        return self._config.get("access_token") or settings.TRUELAYER_ACCESS_TOKEN

    @property
    def _refresh_token(self) -> str:
        return self._config.get("refresh_token") or settings.TRUELAYER_REFRESH_TOKEN

    async def refresh_token(self) -> str:
        if not self.is_configured:
            raise RuntimeError("TrueLayer credentials are not configured")

        payload = {
            "grant_type": "refresh_token",
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "refresh_token": self._refresh_token,
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.AUTH_URL, data=payload)
            response.raise_for_status()
            token_payload = response.json()

        access_token = token_payload.get("access_token")
        if not access_token:
            raise RuntimeError("TrueLayer token refresh did not return an access token")
        return access_token

    async def sync_transactions(self, from_date: date, db: Session) -> list[FinanceDataReal]:
        access_token = self._access_token or await self.refresh_token()
        async with httpx.AsyncClient(
            timeout=20,
            headers={"Authorization": f"Bearer {access_token}"},
        ) as client:
            accounts = await self._list_entities(client, "accounts")
            cards = await self._list_entities(client, "cards")
            transactions = await self._fetch_transactions(client, "accounts", accounts, from_date)
            transactions.extend(await self._fetch_transactions(client, "cards", cards, from_date))

        records: list[FinanceDataReal] = []
        for transaction in transactions:
            record = self._upsert_transaction(db, transaction)
            if record is not None:
                records.append(record)

        db.commit()
        logger.info(
            "truelayer_finance_synced",
            extra={
                "event": "truelayer_finance_synced",
                "extra_data": {
                    "from_date": from_date.isoformat(),
                    "transactions": len(records),
                },
            },
        )
        return records

    async def sync_last_30_days(self, db: Session) -> list[FinanceData]:
        return await self.sync_transactions(date.today() - timedelta(days=29), db)

    async def _list_entities(self, client: httpx.AsyncClient, resource: str) -> list[dict[str, Any]]:
        response = await client.get(f"{self.BASE_URL}/data/v1/{resource}")
        response.raise_for_status()
        return response.json().get("results", [])

    async def _fetch_transactions(
        self,
        client: httpx.AsyncClient,
        resource: str,
        entities: list[dict[str, Any]],
        from_date: date,
    ) -> list[dict[str, Any]]:
        transactions: list[dict[str, Any]] = []
        for entity in entities:
            entity_id = entity.get("account_id") or entity.get("card_id")
            if not entity_id:
                continue
            entity_meta = {
                "account_ref": entity_id,
                "account_name": entity.get("display_name") or entity.get("account_name") or entity.get("card_network"),
                "bank_name": (entity.get("provider") or {}).get("display_name") or entity.get("provider_name"),
                "source_type": "card" if resource == "cards" else "account",
            }
            response = await client.get(
                f"{self.BASE_URL}/data/v1/{resource}/{entity_id}/transactions",
                params={"from": from_date.isoformat(), "to": date.today().isoformat()},
            )
            response.raise_for_status()
            for transaction in response.json().get("results", []):
                transaction["_entity_meta"] = entity_meta
                transactions.append(transaction)
        return transactions

    def _upsert_transaction(self, transaction: dict[str, Any], db: Session) -> FinanceDataReal | None:
        transaction_id = transaction.get("transaction_id")
        if not transaction_id:
            return None

        amount = self._amount_to_pence(transaction.get("amount"))
        if amount is None:
            return None

        booking_date = transaction.get("timestamp") or transaction.get("update_timestamp")
        tx_date = date.fromisoformat(str(booking_date)[:10]) if booking_date else date.today()

        record = db.scalar(select(FinanceDataReal).where(FinanceDataReal.transaction_id == transaction_id))
        if not record:
            record = FinanceDataReal(transaction_id=transaction_id, date=tx_date, amount_pence=amount, category="other")
            db.add(record)

        merchant = transaction.get("merchant_name") or transaction.get("description")
        entity_meta = transaction.get("_entity_meta") or {}
        record.date = tx_date
        record.amount_pence = amount
        record.category = self.categorise_transaction(transaction)
        record.merchant = merchant
        record.description = transaction.get("description")
        record.bank_name = entity_meta.get("bank_name") or record.bank_name
        record.account_name = entity_meta.get("account_name") or record.account_name
        record.account_ref = entity_meta.get("account_ref") or record.account_ref
        record.source_type = entity_meta.get("source_type") or record.source_type
        return record

    @staticmethod
    def _amount_to_pence(value: Any) -> int | None:
        if value is None:
            return None
        try:
            return int((Decimal(str(value)).copy_abs() * 100).quantize(Decimal("1")))
        except (InvalidOperation, ValueError):
            return None

    def categorise_transaction(self, transaction: dict[str, Any]) -> str:
        text = " ".join(
            str(part or "")
            for part in [
                transaction.get("merchant_name"),
                transaction.get("description"),
                transaction.get("transaction_category"),
                transaction.get("transaction_type"),
            ]
        ).lower()

        if any(token in text for token in ("restaurant", "cafe", "coffee", "uber eats", "deliveroo", "takeaway")):
            return "eating_out"
        if any(token in text for token in ("grocery", "grocer", "tesco", "sainsbury", "aldi", "lidl", "waitrose")):
            return "groceries"
        if any(token in text for token in ("train", "tfl", "uber", "bus", "fuel", "petrol", "transport")):
            return "transport"
        if any(token in text for token in ("cinema", "netflix", "spotify", "game", "theatre", "entertainment")):
            return "entertainment"
        if any(token in text for token in ("pub", "bar", "club", "friend", "social")):
            return "social"
        return "other"
