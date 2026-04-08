from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import Integer, inspect, select, text
from sqlalchemy.orm import Session

from ..database import Base, engine
from ..models.data_sources import DataSourceConnection
from ..models.checkins import DailyCheckIn as LegacyDailyCheckIn
from ..models.finance import FinanceData as LegacyFinanceData
from ..models.habits import HabitLog as LegacyHabitLog
from ..models.health import HealthData as LegacyHealthData
from ..models.location import LocationData as LegacyLocationData, LocationDailySummary as LegacyLocationDailySummary
from ..models.music import MusicData as LegacyMusicData
from ..models.nutrition import NutritionLog as LegacyNutritionLog
from ..models.profile import MonthlyBudget as LegacyMonthlyBudget, UserProfile as LegacyUserProfile
from ..models.relationship_imports import RelationshipScreenshotImport as LegacyRelationshipScreenshotImport
from ..models.relationships import Relationship as LegacyRelationship, RelationshipInteraction as LegacyRelationshipInteraction
from ..models.weather import WeatherData as LegacyWeatherData
from ..models.assistant_features import LocationCompanionLog as LegacyLocationCompanionLog
from ..models.conversations import AIConversation as LegacyAIConversation, AIMessage as LegacyAIMessage
from ..models.life_data import (
    AIConversationDemo,
    AIConversationReal,
    AIMessageDemo,
    AIMessageReal,
    DailyCheckInDemo,
    DailyCheckInReal,
    FinanceDataDemo,
    FinanceDataReal,
    HabitLogDemo,
    HabitLogReal,
    HealthDataDemo,
    HealthDataReal,
    LocationCompanionLogDemo,
    LocationCompanionLogReal,
    LocationDailySummaryDemo,
    LocationDailySummaryReal,
    LocationDataDemo,
    LocationDataReal,
    MonthlyBudgetDemo,
    MonthlyBudgetReal,
    MusicDataDemo,
    MusicDataReal,
    SpotifyPlayEventDemo,
    SpotifyPlayEventReal,
    NutritionLogDemo,
    NutritionLogReal,
    RelationshipDemo,
    RelationshipInteractionDemo,
    RelationshipInteractionReal,
    RelationshipReal,
    RelationshipScreenshotImportDemo,
    RelationshipScreenshotImportReal,
    UserProfileDemo,
    UserProfileReal,
    WeatherDataDemo,
    WeatherDataReal,
)


LIFE_DATA_TABLES = [
    HealthDataReal.__table__,
    HealthDataDemo.__table__,
    FinanceDataReal.__table__,
    FinanceDataDemo.__table__,
    MusicDataReal.__table__,
    MusicDataDemo.__table__,
    SpotifyPlayEventReal.__table__,
    SpotifyPlayEventDemo.__table__,
    WeatherDataReal.__table__,
    WeatherDataDemo.__table__,
    NutritionLogReal.__table__,
    NutritionLogDemo.__table__,
    DailyCheckInReal.__table__,
    DailyCheckInDemo.__table__,
    HabitLogReal.__table__,
    HabitLogDemo.__table__,
    RelationshipReal.__table__,
    RelationshipDemo.__table__,
    RelationshipInteractionReal.__table__,
    RelationshipInteractionDemo.__table__,
    RelationshipScreenshotImportReal.__table__,
    RelationshipScreenshotImportDemo.__table__,
    LocationDataReal.__table__,
    LocationDataDemo.__table__,
    LocationDailySummaryReal.__table__,
    LocationDailySummaryDemo.__table__,
    LocationCompanionLogReal.__table__,
    LocationCompanionLogDemo.__table__,
    UserProfileReal.__table__,
    UserProfileDemo.__table__,
    MonthlyBudgetReal.__table__,
    MonthlyBudgetDemo.__table__,
    AIConversationReal.__table__,
    AIConversationDemo.__table__,
    AIMessageReal.__table__,
    AIMessageDemo.__table__,
]


def ensure_life_data_tables() -> None:
    Base.metadata.create_all(bind=engine, tables=LIFE_DATA_TABLES)


def bootstrap_life_data(db: Session) -> None:
    ensure_life_data_tables()

    _copy_if_empty(db, LegacyHealthData, HealthDataDemo, is_demo=True)
    _copy_if_empty(db, LegacyFinanceData, FinanceDataDemo, is_demo=True)
    _copy_if_empty(db, LegacyMusicData, MusicDataDemo, is_demo=True)
    _copy_if_empty(db, LegacyWeatherData, WeatherDataDemo, is_demo=True)
    _copy_if_empty(db, LegacyNutritionLog, NutritionLogDemo, is_demo=True)
    _copy_if_empty(db, LegacyDailyCheckIn, DailyCheckInDemo, is_demo=True)
    _copy_if_empty(db, LegacyHabitLog, HabitLogDemo, is_demo=True)
    _copy_if_empty(db, LegacyRelationship, RelationshipDemo, is_demo=True)
    _copy_if_empty(db, LegacyRelationshipInteraction, RelationshipInteractionDemo, is_demo=True)
    _copy_if_empty(db, LegacyRelationshipScreenshotImport, RelationshipScreenshotImportDemo, is_demo=True)
    _copy_if_empty(db, LegacyLocationData, LocationDataDemo, is_demo=True)
    _copy_if_empty(db, LegacyLocationDailySummary, LocationDailySummaryDemo, is_demo=True)
    _copy_if_empty(db, LegacyLocationCompanionLog, LocationCompanionLogDemo, is_demo=True)
    _copy_if_empty(db, LegacyUserProfile, UserProfileDemo, is_demo=True)
    _copy_if_empty(db, LegacyMonthlyBudget, MonthlyBudgetDemo, is_demo=True)
    _copy_conversations_if_empty(db, is_demo=True)

    _copy_if_empty(db, LegacyHealthData, HealthDataReal, is_demo=False, allow_real=_source_synced(db, "garmin"))
    _copy_if_empty(db, LegacyFinanceData, FinanceDataReal, is_demo=False, allow_real=_source_synced(db, "truelayer"))
    _copy_if_empty(db, LegacyMusicData, MusicDataReal, is_demo=False, allow_real=_source_synced(db, "spotify"))
    _copy_if_empty(db, LegacyWeatherData, WeatherDataReal, is_demo=False, allow_real=_source_synced(db, "weather"))
    _copy_if_empty(db, LegacyLocationData, LocationDataReal, is_demo=False, allow_real=_source_synced(db, "owntracks"))
    _copy_if_empty(db, LegacyLocationDailySummary, LocationDailySummaryReal, is_demo=False, allow_real=_source_synced(db, "owntracks"))
    _copy_if_empty(db, LegacyLocationCompanionLog, LocationCompanionLogReal, is_demo=False, allow_real=_source_synced(db, "owntracks"))

    _copy_if_empty(db, LegacyNutritionLog, NutritionLogReal, is_demo=False)
    _copy_if_empty(db, LegacyDailyCheckIn, DailyCheckInReal, is_demo=False)
    _copy_if_empty(db, LegacyHabitLog, HabitLogReal, is_demo=False)
    _copy_if_empty(db, LegacyRelationship, RelationshipReal, is_demo=False)
    _copy_if_empty(db, LegacyRelationshipInteraction, RelationshipInteractionReal, is_demo=False)
    _copy_if_empty(db, LegacyRelationshipScreenshotImport, RelationshipScreenshotImportReal, is_demo=False)
    _copy_if_empty(db, LegacyUserProfile, UserProfileReal, is_demo=False)
    _copy_if_empty(db, LegacyMonthlyBudget, MonthlyBudgetReal, is_demo=False)
    _copy_conversations_if_empty(db, is_demo=False)

    db.flush()
    _reset_table_sequences(db)
    db.commit()


def _source_synced(db: Session, source_id: str) -> bool:
    source = db.get(DataSourceConnection, source_id)
    return bool(source and source.last_sync_at and source.last_sync_status == "success")


def _copy_if_empty(db: Session, source_model, target_model, *, is_demo: bool, allow_real: bool = True) -> None:
    if not allow_real and not is_demo:
        return
    if db.scalar(select(target_model).limit(1)) is not None:
        return
    if not inspect(engine).has_table(source_model.__tablename__):
        return

    columns = _shared_columns(source_model, target_model)
    rows = db.scalars(select(source_model).where(source_model.is_demo.is_(is_demo))).all()
    for row in rows:
        db.add(target_model(**{column: getattr(row, column) for column in columns}))


def _shared_columns(source_model, target_model) -> list[str]:
    source_columns = {column.name for column in source_model.__table__.columns}
    target_columns = [column.name for column in target_model.__table__.columns]
    return [column for column in target_columns if column in source_columns]


def _copy_conversations_if_empty(db: Session, *, is_demo: bool) -> None:
    conversation_model = AIConversationDemo if is_demo else AIConversationReal
    message_model = AIMessageDemo if is_demo else AIMessageReal
    if db.scalar(select(conversation_model).limit(1)) is not None:
        return
    if not inspect(engine).has_table(LegacyAIConversation.__tablename__):
        return

    conversations = db.scalars(
        select(LegacyAIConversation).where(LegacyAIConversation.is_demo.is_(is_demo))
    ).all()
    message_columns = _shared_columns(LegacyAIMessage, message_model)
    conversation_columns = _shared_columns(LegacyAIConversation, conversation_model)

    for row in conversations:
        db.add(conversation_model(**{column: getattr(row, column) for column in conversation_columns if column != "is_demo"}))
        for message in row.messages:
            db.add(message_model(**{column: getattr(message, column) for column in message_columns}))


def _reset_table_sequences(db: Session) -> None:
    if engine.dialect.name != "postgresql":
        return

    for table in LIFE_DATA_TABLES:
        id_column = table.columns.get("id")
        if (
            id_column is None
            or not isinstance(id_column.type, Integer)
            or not getattr(id_column, "autoincrement", False)
        ):
            continue
        table_name = table.name
        db.execute(
            text(
                """
                SELECT setval(sequence_name, max_id, has_rows)
                FROM (
                    SELECT
                        pg_get_serial_sequence(:table_name, 'id') AS sequence_name,
                        COALESCE(MAX(id), 1)::bigint AS max_id,
                        (COALESCE(MAX(id), 0) > 0) AS has_rows
                    FROM {table}
                ) sequence_state
                WHERE sequence_name IS NOT NULL
                """.replace("{table}", table_name)
            ),
            {"table_name": table_name},
        )
