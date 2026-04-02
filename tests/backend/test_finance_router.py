from types import SimpleNamespace

from backend.routers import finance as finance_router


def test_finance_today_returns_latest_summary(client):
    response = client.get("/api/finance/today", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["totalSpend"] >= 0
    assert "groceries" in payload
    assert "social" in payload


def test_finance_period_accepts_month_alias(client):
    response = client.get("/api/finance?period=month", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert len(payload) <= 31


def test_finance_sync_uses_service_result(client, monkeypatch):
    async def fake_sync(_db):
        return [SimpleNamespace(transaction_id="tx-1"), SimpleNamespace(transaction_id="tx-2")]

    monkeypatch.setattr(finance_router.service, "sync_last_30_days", fake_sync)

    response = client.post("/api/finance/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 200
    assert response.json() == {
        "detail": "Finance synced",
        "transactionsSynced": 2,
    }


def test_finance_sync_surfaces_configuration_errors(client, monkeypatch):
    async def fake_sync(_db):
        raise RuntimeError("TrueLayer credentials are not configured")

    monkeypatch.setattr(finance_router.service, "sync_last_30_days", fake_sync)

    response = client.post("/api/finance/sync", headers={"X-API-Key": "dev-secret-key"})

    assert response.status_code == 400
    assert "TrueLayer credentials" in response.json()["detail"]
