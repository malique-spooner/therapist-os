from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

from sqlalchemy import text

from backend.config import settings
from backend.database import engine


TABLES = [
    "alembic_version",
    "data_source_connections",
    "data_source_sync_attempts",
    "raw_data_imports",
    "raw_import_rows",
    "health_data",
    "health_data_real",
    "health_data_demo",
    "finance_data",
    "finance_data_real",
    "finance_data_demo",
    "music_data",
    "music_data_real",
    "music_data_demo",
    "daily_checkins",
    "daily_checkins_real",
    "daily_checkins_demo",
    "habits",
    "habit_logs",
    "habit_logs_real",
    "habit_logs_demo",
    "ai_conversations",
    "ai_conversations_real",
    "ai_conversations_demo",
    "weather_data",
    "weather_data_real",
    "weather_data_demo",
    "location_data",
    "location_data_real",
    "location_data_demo",
]


def _redact_database_url(database_url: str) -> str:
    parts = urlsplit(database_url)
    if "@" not in parts.netloc:
        return database_url
    userinfo, hostinfo = parts.netloc.rsplit("@", 1)
    if ":" in userinfo:
        username, _password = userinfo.split(":", 1)
        userinfo = f"{username}:***"
    return urlunsplit((parts.scheme, f"{userinfo}@{hostinfo}", parts.path, parts.query, parts.fragment))


def main() -> None:
    print("SETTINGS")
    print(f"DATABASE_URL={_redact_database_url(settings.DATABASE_URL)}")
    print(f"ENVIRONMENT={settings.ENVIRONMENT}")
    print(f"SEED_DEMO_DATA={settings.SEED_DEMO_DATA}")
    print(f"AUTO_RUN_MIGRATIONS={settings.AUTO_RUN_MIGRATIONS}")
    print()

    with engine.connect() as connection:
        print("ALEMBIC")
        version = connection.execute(text("select version_num from alembic_version")).scalar_one_or_none()
        print(f"version={version or ''}")
        print()

        print("DATA_SOURCE_CONNECTIONS")
        rows = connection.execute(
            text(
                """
                select source_id, connected, available, coalesce(last_sync_status, '') as last_sync_status,
                       coalesce(to_char(last_sync_at, 'YYYY-MM-DD HH24:MI:SS'), '') as last_sync_at,
                       coalesce(last_error, '') as last_error
                from data_source_connections
                order by source_id
                """
            )
        ).fetchall()
        for row in rows:
            print("|".join(str(value) for value in row))
        print()

        print("COUNTS")
        for table in TABLES:
            try:
                count = connection.execute(text(f"select count(*) from {table}")).scalar_one()
            except Exception as exc:  # pragma: no cover - diagnostic output only
                print(f"{table}|ERROR|{exc}")
            else:
                print(f"{table}|{count}")


if __name__ == "__main__":
    main()
