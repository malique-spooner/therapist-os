from __future__ import annotations

import subprocess
import sys

from sqlalchemy import inspect

from .config import settings
from .database import SessionLocal, engine
from .services.life_data_bootstrap import bootstrap_life_data
from .services.seed import seed_demo_data


def run_migrations() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
        check=True,
    )


def seed_if_enabled() -> None:
    if not settings.SEED_DEMO_DATA:
        return
    if not inspect(engine).has_table("health_data"):
        raise RuntimeError("Database schema is missing. Run migrations before seeding.")
    with SessionLocal() as db:
        bootstrap_life_data(db)
        seed_demo_data(db)


def bootstrap() -> None:
    run_migrations()
    seed_if_enabled()


if __name__ == "__main__":
    bootstrap()
