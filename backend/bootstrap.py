from __future__ import annotations

import subprocess
import sys


def run_migrations() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
        check=True,
    )

def bootstrap() -> None:
    run_migrations()


if __name__ == "__main__":
    bootstrap()
