from __future__ import annotations

import subprocess
import sys

from .database import SessionLocal
from .services.life_data_bootstrap import bootstrap_life_data


def run_migrations() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
        check=True,
    )

def bootstrap() -> None:
    run_migrations()
    with SessionLocal() as db:
        bootstrap_life_data(db)


if __name__ == "__main__":
    bootstrap()
