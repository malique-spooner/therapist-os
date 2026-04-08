from datetime import date, timedelta

from sqlalchemy import func, select

from backend.models.life_data import (
    AIConversationDemo as AIConversation,
    DailyCheckInDemo as DailyCheckIn,
    FinanceDataDemo as FinanceData,
    HealthDataDemo as HealthData,
    MonthlyBudgetDemo as MonthlyBudget,
    MusicDataDemo as MusicData,
    NutritionLogDemo as NutritionLog,
    RelationshipDemo as Relationship,
    RelationshipInteractionDemo as RelationshipInteraction,
    RelationshipScreenshotImportDemo as RelationshipScreenshotImport,
    UserProfileDemo as UserProfile,
    WeatherDataDemo as WeatherData,
)
from backend.services.seed import seed_demo_data


def test_seed_demo_data_covers_last_90_days_and_is_idempotent(db_session):
    # seeded once by fixture; run it again to verify idempotent top-up behavior
    seed_demo_data(db_session)

    expected_start = date.today() - timedelta(days=89)
    expected_end = date.today()

    for model in (HealthData, MusicData, NutritionLog, DailyCheckIn, WeatherData):
        count = db_session.scalar(select(func.count()).select_from(model))
        min_date = db_session.scalar(select(func.min(model.date)))
        max_date = db_session.scalar(select(func.max(model.date)))

        assert count == 90
        assert min_date == expected_start
        assert max_date == expected_end

    finance_count = db_session.scalar(select(func.count()).select_from(FinanceData))
    assert finance_count == 90 * 6

    relationship_count = db_session.scalar(select(func.count()).select_from(Relationship))
    assert relationship_count >= 6

    interaction_demo_count = db_session.scalar(select(func.count()).select_from(RelationshipInteraction))
    assert interaction_demo_count > 0

    latest_interaction_timestamp = db_session.scalar(select(func.max(RelationshipInteraction.timestamp)))
    assert latest_interaction_timestamp > 2_147_483_647

    assert db_session.scalar(select(func.count()).select_from(AIConversation)) == 1
    assert db_session.scalar(select(func.count()).select_from(MonthlyBudget)) == 1
    assert db_session.scalar(select(func.count()).select_from(UserProfile)) == 1
    assert db_session.scalar(select(func.count()).select_from(RelationshipScreenshotImport)) == 1
