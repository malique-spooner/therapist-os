from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import settings
from backend.database import Base
from backend.main import app
from backend.database import get_db
from backend.services.seed import seed_demo_data


@pytest.fixture()
def db_session(tmp_path: Path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False}, future=True)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(bind=engine)

    with TestingSessionLocal() as session:
        seed_demo_data(session)

    with TestingSessionLocal() as session:
        yield session

    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    @asynccontextmanager
    async def test_lifespan(_app):
        yield

    app.dependency_overrides[get_db] = override_get_db
    original_lifespan = app.router.lifespan_context
    original_api_key = settings.API_SECRET_KEY
    app.router.lifespan_context = test_lifespan
    settings.API_SECRET_KEY = "dev-secret-key"

    with TestClient(app, base_url="http://localhost") as test_client:
        yield test_client

    app.dependency_overrides.clear()
    app.router.lifespan_context = original_lifespan
    settings.API_SECRET_KEY = original_api_key
