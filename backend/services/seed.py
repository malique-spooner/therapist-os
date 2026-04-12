from __future__ import annotations

from datetime import date, datetime, timedelta
from math import floor, sin

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..models import DataSourceConnection, DataSourceSyncAttempt, Habit
from ..models.life_data import (
    AIConversationDemo as AIConversation,
    AIMessageDemo as AIMessage,
    DailyCheckInDemo as DailyCheckIn,
    FinanceDataDemo as FinanceData,
    HabitLogDemo as HabitLog,
    HealthDataDemo as HealthData,
    LocationCompanionLogDemo as LocationCompanionLog,
    LocationDailySummaryDemo as LocationDailySummary,
    LocationDataDemo as LocationData,
    LocationPlaceHistoryDemo as LocationPlaceHistory,
    LocationPlaceMemoryDemo as LocationPlaceMemory,
    MonthlyBudgetDemo as MonthlyBudget,
    MusicDataDemo as MusicData,
    RelationshipDemo as Relationship,
    RelationshipInteractionDemo as RelationshipInteraction,
    RelationshipScreenshotImportDemo as RelationshipScreenshotImport,
    UserProfileDemo as UserProfile,
    WeatherDataDemo as WeatherData,
)

DEMO_SOURCE_IDS = ("garmin", "truelayer", "spotify", "youtube", "weather", "owntracks")
DEMO_PLACES = [
    ("home", "Home", "home", "neutral", 51.5074, -0.1278, "Base, recovery, late evenings."),
    ("work", "Studio Office", "work", "draining", 51.5156, -0.0919, "Deep work and deadline pressure."),
    ("university", "University Library", "work", "neutral", 51.5232, -0.1329, "Study blocks and focused reading."),
    ("gym", "Movement Studio", "gym", "positive", 51.5033, -0.1195, "Training, sport, and better energy after."),
    ("park", "Riverside Park", "green_space", "positive", 51.5055, -0.1049, "Walks that usually settle the day."),
    ("pub", "The Anchor Pub", "social", "positive", 51.5081, -0.0974, "Friends, football, and noisy decompression."),
    ("cafe", "Corner Cafe", "cafe", "positive", 51.5111, -0.1013, "Coffee, laptop time, and low-stakes reset."),
    ("supermarket", "Market Run", "errands", "neutral", 51.5142, -0.1161, "Groceries and practical errands."),
    ("station", "Tube Junction", "transit", "draining", 51.5098, -0.1180, "Commute handoff and friction."),
    ("football", "Five-a-side Pitch", "social", "positive", 51.5202, -0.1029, "Team sport, competition, and connection."),
]
DEMO_TRACKS = [
    ("Nights", "Frank Ocean", "alt r&b"),
    ("Pink + White", "Frank Ocean", "alt r&b"),
    ("Seigfried", "Frank Ocean", "alt r&b"),
    ("Dang!", "Mac Miller", "neo-soul"),
    ("Good News", "Mac Miller", "neo-soul"),
    ("Sweet Disposition", "The Temper Trap", "indie rock"),
    ("Midnight City", "M83", "electronic"),
    ("Glue", "Bicep", "electronic"),
    ("Motion Sickness", "Phoebe Bridgers", "indie rock"),
    ("Garden Song", "Phoebe Bridgers", "indie folk"),
    ("Breathe Deeper", "Tame Impala", "psychedelic pop"),
    ("Eventually", "Tame Impala", "psychedelic pop"),
]

DEFAULT_HABITS = [
    {"id": "racket-sport", "name": "I will play racket sports three times a week because I am an athlete.", "action_text": "play racket sports", "when_text": "three times a week", "why_text": "I am an athlete", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 3, "sub_label": None, "category": "Movement", "category_icon": "🎾", "habit_type": "boolean", "frequency": "3x per week"},
    {"id": "team-sport", "name": "I will play team sports once a week because I perform better when I compete with other people.", "action_text": "play team sports", "when_text": "once a week", "why_text": "I perform better when I compete with other people", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 1, "sub_label": None, "category": "Movement", "category_icon": "⚽", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "running", "name": "I will go for a run once a week because I want my body to stay sharp and capable.", "action_text": "go for a run", "when_text": "once a week", "why_text": "I want my body to stay sharp and capable", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 1, "sub_label": None, "category": "Movement", "category_icon": "🏃", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "passive-exercise", "name": "I will do passive exercise once a week because easy movement keeps my energy from collapsing.", "action_text": "do passive exercise", "when_text": "once a week", "why_text": "easy movement keeps my energy from collapsing", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 1, "sub_label": None, "category": "Movement", "category_icon": "🚲", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "cad", "name": "I will practice CAD twice a week because I want to keep building useful technical skills.", "action_text": "practice CAD", "when_text": "twice a week", "why_text": "I want to keep building useful technical skills", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 2, "sub_label": None, "category": "Learning", "category_icon": "📐", "habit_type": "boolean", "frequency": "2x per week"},
    {"id": "computer-science", "name": "I will study computer science three times a week because I want to become exceptional at building things.", "action_text": "study computer science", "when_text": "three times a week", "why_text": "I want to become exceptional at building things", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 3, "sub_label": None, "category": "Learning", "category_icon": "💻", "habit_type": "boolean", "frequency": "3x per week"},
    {"id": "read-pages", "name": "I will read 25 pages a week because I want my mind to keep compounding.", "action_text": "read 25 pages", "when_text": "a week", "why_text": "I want my mind to keep compounding", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 25, "sub_label": None, "category": "Learning", "category_icon": "📚", "habit_type": "numeric", "unit": "pages", "frequency": "25 pages per week"},
    {"id": "audiobooks", "name": "I will listen to audiobooks during low-focus moments because I want to keep learning even when I am tired.", "action_text": "listen to audiobooks", "when_text": "during low-focus moments", "why_text": "I want to keep learning even when I am tired", "habit_mode": "good", "cadence_type": "custom", "target_count": 1, "sub_label": None, "category": "Learning", "category_icon": "🎧", "habit_type": "boolean", "frequency": "6 per year"},
    {"id": "watch-episodes", "name": "I will watch a couple of episodes after my essentials are done because rest is better when it is chosen.", "action_text": "watch a couple of episodes", "when_text": "after my essentials are done", "why_text": "rest is better when it is chosen", "habit_mode": "good", "cadence_type": "trigger", "target_count": 1, "sub_label": None, "category": "Media", "category_icon": "📺", "habit_type": "boolean", "frequency": "2 per week"},
    {"id": "listen-music", "name": "I will listen to music when I need to shift my mood or focus because music helps me regulate my state.", "action_text": "listen to music", "when_text": "when I need to shift my mood or focus", "why_text": "music helps me regulate my state", "habit_mode": "good", "cadence_type": "custom", "target_count": 1, "sub_label": None, "category": "Media", "category_icon": "🎵", "habit_type": "boolean", "frequency": "daily"},
    {"id": "facetime", "name": "I will FaceTime people after work or between plans because I want to keep close relationships active.", "action_text": "FaceTime people", "when_text": "after work or between plans", "why_text": "I want to keep close relationships active", "habit_mode": "good", "cadence_type": "custom", "target_count": 1, "sub_label": None, "category": "Social", "category_icon": "📱", "habit_type": "boolean", "frequency": "5x per week"},
    {"id": "irl", "name": "I will see someone in real life once a week because real connection matters more than passive contact.", "action_text": "see someone in real life", "when_text": "once a week", "why_text": "real connection matters more than passive contact", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 1, "sub_label": None, "category": "Social", "category_icon": "🤝", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "post", "name": "I will post twice a week because I want to stay visible and expressive.", "action_text": "post", "when_text": "twice a week", "why_text": "I want to stay visible and expressive", "habit_mode": "good", "cadence_type": "weekly-count", "target_count": 2, "sub_label": None, "category": "Social", "category_icon": "🪄", "habit_type": "boolean", "frequency": "2 per week"},
    {"id": "cook", "name": "I will cook when I plan a home evening because feeding myself properly makes everything easier.", "action_text": "cook", "when_text": "when I plan a home evening", "why_text": "feeding myself properly makes everything easier", "habit_mode": "good", "cadence_type": "custom", "target_count": 1, "sub_label": None, "category": "Home", "category_icon": "🍳", "habit_type": "boolean", "frequency": "biweekly"},
    {"id": "clean", "name": "I will clean my space every two weeks because a cleaner space makes me calmer and more capable.", "action_text": "clean my space", "when_text": "every two weeks", "why_text": "a cleaner space makes me calmer and more capable", "habit_mode": "good", "cadence_type": "custom", "target_count": 1, "sub_label": None, "category": "Home", "category_icon": "🧼", "habit_type": "boolean", "frequency": "biweekly"},
    {"id": "journal", "name": "I will journal after I eat dinner because I want to record my thoughts clearly.", "action_text": "journal", "when_text": "after I eat dinner", "why_text": "I want to record my thoughts clearly", "habit_mode": "good", "cadence_type": "trigger", "target_count": 1, "sub_label": None, "category": "Mind", "category_icon": "✍️", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "plan-week", "name": "I will plan the week on Sunday evening because I want the week to feel deliberate, not reactive.", "action_text": "plan the week", "when_text": "on Sunday evening", "why_text": "I want the week to feel deliberate, not reactive", "habit_mode": "good", "cadence_type": "time-of-day", "target_count": 1, "sub_label": None, "category": "Mind", "category_icon": "🗓️", "habit_type": "boolean", "frequency": "weekly"},
    {"id": "sleep-before-12", "name": "I will go to sleep before 12 because I want to live longer and recover better.", "action_text": "go to sleep before 12", "when_text": "every day", "why_text": "I want to live longer and recover better", "habit_mode": "good", "cadence_type": "daily", "target_count": 7, "sub_label": None, "category": "Sleep", "category_icon": "🌙", "habit_type": "boolean", "frequency": "4x per week"},
    {"id": "wake-7am", "name": "I will wake up at 7am because I want my mornings to have structure.", "action_text": "wake up at 7am", "when_text": "every day", "why_text": "I want my mornings to have structure", "habit_mode": "good", "cadence_type": "daily", "target_count": 7, "sub_label": None, "category": "Sleep", "category_icon": "⏰", "habit_type": "boolean", "frequency": "daily"},
    {"id": "smoke-limit", "name": "I will keep smoking under 1g a week because I do not want it quietly controlling my health.", "action_text": "keep smoking under 1g", "when_text": "a week", "why_text": "I do not want it quietly controlling my health", "habit_mode": "bad", "cadence_type": "weekly-count", "target_count": 0, "sub_label": None, "category": "Health", "category_icon": "🌿", "habit_type": "numeric", "unit": "g", "frequency": "1g max per week"},
    {"id": "quit-snus", "name": "I will stay off snus because I do not want nicotine deciding my state.", "action_text": "stay off snus", "when_text": "whenever the urge hits", "why_text": "I do not want nicotine deciding my state", "habit_mode": "bad", "cadence_type": "custom", "target_count": 0, "sub_label": None, "category": "Health", "category_icon": "🚭", "habit_type": "numeric", "unit": "pouches", "frequency": "daily"},
    {"id": "alcohol", "name": "I will stay off alcohol because I do not want it blunting my judgment and recovery.", "action_text": "stay off alcohol", "when_text": "whenever the option comes up", "why_text": "I do not want it blunting my judgment and recovery", "habit_mode": "bad", "cadence_type": "custom", "target_count": 0, "sub_label": None, "category": "Health", "category_icon": "🍺", "habit_type": "numeric", "unit": "units", "frequency": "as needed"},
    {"id": "weed", "name": "I will stay off weed because I do not want it fogging my drive and attention.", "action_text": "stay off weed", "when_text": "whenever the urge hits", "why_text": "I do not want it fogging my drive and attention", "habit_mode": "bad", "cadence_type": "custom", "target_count": 0, "sub_label": None, "category": "Health", "category_icon": "🍃", "habit_type": "numeric", "unit": "g", "frequency": "as needed"},
    {"id": "masturbate", "name": "I will avoid masturbating when I am escaping discomfort because I want my urges to feel deliberate, not automatic.", "action_text": "avoid masturbating", "when_text": "when I am escaping discomfort", "why_text": "I want my urges to feel deliberate, not automatic", "habit_mode": "bad", "cadence_type": "trigger", "target_count": 0, "sub_label": None, "category": "Mind", "category_icon": "⚠️", "habit_type": "numeric", "unit": "incidents", "frequency": "as needed"},
]

RELATIONSHIP_PEOPLE = [
    {"id": "alex", "name": "Alex", "type": "close_friend", "tier": "inner", "desired_frequency_days": 7, "avatar_colour": "#2D6A4F"},
    {"id": "mum", "name": "Mum", "type": "family", "tier": "inner", "desired_frequency_days": 7, "avatar_colour": "#40916C"},
    {"id": "jamie", "name": "Jamie", "type": "close_friend", "tier": "middle", "desired_frequency_days": 14, "avatar_colour": "#52B788"},
    {"id": "priya", "name": "Priya", "type": "friend", "tier": "middle", "desired_frequency_days": 30, "avatar_colour": "#74C69D"},
    {"id": "dan", "name": "Dan", "type": "colleague", "tier": "outer", "desired_frequency_days": 30, "avatar_colour": "#95D5B2"},
    {"id": "sarah", "name": "Sarah", "type": "close_friend", "tier": "inner", "desired_frequency_days": 7, "avatar_colour": "#1B4332"},
]


def _seed(n: int) -> float:
    x = sin(n) * 10000
    return x - floor(x)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _demo_window() -> tuple[date, date]:
    end = date.today()
    start = end - timedelta(days=89)
    return start, end


def _cleanup_demo_window(db: Session, start: date, end: date) -> None:
    demo_tables = (
        HealthData,
        MusicData,
        WeatherData,
        DailyCheckIn,
        LocationDailySummary,
        LocationCompanionLog,
    )
    for model in demo_tables:
        db.execute(delete(model).where((model.date < start) | (model.date > end)))

    db.execute(delete(FinanceData).where((FinanceData.date < start) | (FinanceData.date > end)))
    db.execute(delete(HabitLog).where((HabitLog.date < start) | (HabitLog.date > end)))
    db.execute(delete(RelationshipInteraction).where((RelationshipInteraction.date < start) | (RelationshipInteraction.date > end)))
    db.execute(delete(LocationPlaceHistory).where(LocationPlaceHistory.created_at < datetime(start.year, start.month, start.day)))
    db.execute(
        delete(LocationData).where(
            (LocationData.timestamp < datetime(start.year, start.month, start.day))
            | (LocationData.timestamp > datetime(end.year, end.month, end.day, 23, 59, 59)),
        )
    )


def _upsert_daily_demo(
    db: Session,
    model,
    target_date: date,
    **values,
):
    row = db.scalar(select(model).where(model.date == target_date))
    if not row:
        row = model(date=target_date)
        db.add(row)
    for key, value in values.items():
        setattr(row, key, value)
    return row


def _upsert_location_point(db: Session, when: datetime, lat: float, lng: float, index: int) -> None:
    row = db.scalar(select(LocationData).where(LocationData.timestamp == when))
    if not row:
        row = LocationData(timestamp=when, latitude=lat, longitude=lng)
        db.add(row)
    row.latitude = lat
    row.longitude = lng
    row.accuracy = 10 + (index % 4) * 4
    row.battery_level = max(18, 94 - (index % 8) * 7)


def _seed_place_memory(db: Session, start: date, end: date) -> None:
    demo_place_keys = {place[0] for place in DEMO_PLACES}
    db.execute(delete(LocationPlaceMemory).where(LocationPlaceMemory.place_key.not_in(demo_place_keys)))
    for place_key, label, category, tone, lat, lng, note in DEMO_PLACES:
        row = db.scalar(select(LocationPlaceMemory).where(LocationPlaceMemory.place_key == place_key))
        if not row:
            row = LocationPlaceMemory(place_key=place_key)
            db.add(row)
        row.label = label
        row.category = category
        row.tone = tone
        row.note = note
        row.latitude = lat
        row.longitude = lng
        row.status = "active"
        row.visit_count = 90 if place_key == "home" else max(8, int(12 + _seed(len(place_key)) * 34))
        row.total_minutes = row.visit_count * (480 if place_key == "home" else 80 + int(_seed(len(label)) * 110))
        row.first_seen_at = datetime.combine(start, datetime.min.time()).replace(hour=8)
        row.last_seen_at = datetime.combine(end, datetime.min.time()).replace(hour=22)
        row.confidence_score = 0.96 if place_key in {"home", "work", "gym"} else 0.72 + _seed(len(note)) * 0.2
        if not db.scalar(select(LocationPlaceHistory.id).where(LocationPlaceHistory.place_key == place_key).limit(1)):
            db.add(LocationPlaceHistory(place_key=place_key, action="seeded", detail_json={"label": label, "category": category}))


def _upsert_demo_sync_attempt(
    db: Session,
    *,
    source_id: str,
    rows_synced: int,
    attempted_at: datetime | None,
    detail: str,
    trigger: str,
) -> None:
    if rows_synced <= 0 or attempted_at is None:
        return
    if trigger != "seed":
        db.add(
            DataSourceSyncAttempt(
                source_id=source_id,
                status="demo-refresh",
                trigger=trigger,
                data_mode="demo-only",
                rows_synced=rows_synced,
                attempted_at=attempted_at,
                detail=detail,
            )
        )
        return

    attempt = db.scalar(
        select(DataSourceSyncAttempt)
        .where(
            DataSourceSyncAttempt.source_id == source_id,
            DataSourceSyncAttempt.data_mode == "demo-only",
            DataSourceSyncAttempt.trigger == "seed",
        )
        .order_by(DataSourceSyncAttempt.attempted_at.desc())
        .limit(1)
    )
    if not attempt:
        attempt = DataSourceSyncAttempt(
            source_id=source_id,
            status="demo-refresh",
            trigger="seed",
            data_mode="demo-only",
        )
        db.add(attempt)
    attempt.rows_synced = rows_synced
    attempt.attempted_at = attempted_at
    attempt.detail = detail
    attempt.cooldown_until = None


def _cleanup_demo_sync_attempts(db: Session) -> None:
    cutoff = datetime.utcnow() - timedelta(days=90)
    db.execute(
        delete(DataSourceSyncAttempt).where(
            DataSourceSyncAttempt.data_mode == "demo-only",
            DataSourceSyncAttempt.trigger != "seed",
            DataSourceSyncAttempt.attempted_at < cutoff,
        )
    )


def seed_demo_data(
    db: Session,
    *,
    attempt_source_ids: tuple[str, ...] | None = None,
    attempt_trigger: str = "seed",
) -> None:
    start, end = _demo_window()
    _cleanup_demo_window(db, start, end)
    _cleanup_demo_sync_attempts(db)
    attempt_sources = set(attempt_source_ids or DEMO_SOURCE_IDS)
    attempted_at = datetime.utcnow()

    daily_categories: dict[date, dict[str, int]] = {}
    daily_social_evenings: dict[date, bool] = {}
    _seed_place_memory(db, start, end)

    for i in range(90):
        day = start + timedelta(days=i)
        dow = day.weekday()
        progress = i / 89
        r1 = _seed(i * 7 + 1)
        r2 = _seed(i * 13 + 2)
        r3 = _seed(i * 17 + 3)
        r4 = _seed(i * 23 + 4)
        r5 = _seed(i * 31 + 5)
        is_weekend = dow >= 5

        workout_logged = r3 > (0.55 if is_weekend else 0.45)
        sleep_duration = max(4.5, min(8.5, _lerp(6.2, 7.4, progress) + (r1 - 0.5) * 2.2))
        sleep_quality = max(4, min(9, round(_lerp(6.0, 7.4, progress) + (r2 - 0.5) * 3)))
        steps = max(4000, min(14000, round((11000 if workout_logged else 7000) + (r4 - 0.5) * 5000)))
        hrv = max(28, min(72, round(_lerp(44, 52, progress) + (r5 - 0.5) * 20)))
        resting_hr = max(52, min(72, round(_lerp(64, 58, progress) + (r1 - 0.5) * 8)))

        _upsert_daily_demo(
            db,
            HealthData,
            day,
            steps=steps,
            sleep_duration_hours=round(sleep_duration, 1),
            sleep_quality=float(sleep_quality),
            hrv_ms=float(hrv),
            resting_hr=resting_hr,
            workout_logged=workout_logged,
            workout_type="gym" if workout_logged else None,
            workout_duration_minutes=45 if workout_logged else 0,
        )

        has_social_evening = r1 > (0.45 if is_weekend else 0.75)
        budget_multiplier = _lerp(1.15, 0.9, progress)
        categories = {
            "eating_out": round((25 + r2 * 40) * budget_multiplier) if has_social_evening else round(r2 * 20 * budget_multiplier),
            "groceries": round(10 + r3 * 25),
            "transport": round(4 + r4 * 12),
            "entertainment": round(r5 * 30) if has_social_evening else round(r5 * 12),
            "social": round(10 + r1 * 25) if has_social_evening else 0,
            "other": round(r2 * 15),
        }
        daily_categories[day] = categories
        daily_social_evenings[day] = has_social_evening
        for category, amount in categories.items():
            record = db.scalar(select(FinanceData).where(FinanceData.transaction_id == f"demo-{day.isoformat()}-{category}"))
            if not record:
                record = FinanceData(transaction_id=f"demo-{day.isoformat()}-{category}")
                db.add(record)
            use_revolut = category in {"social", "entertainment"} or (has_social_evening and category == "eating_out")
            bank_name = "Revolut" if use_revolut else "NatWest"
            account_name = "Revolut Current" if use_revolut else "NatWest Current"
            record.date = day
            record.amount_pence = amount * 100
            record.category = category
            record.merchant = category.replace("_", " ").title()
            record.description = f"Seeded {category} transaction"
            record.bank_name = bank_name
            record.account_name = account_name
            record.account_ref = "revolut-current" if use_revolut else "natwest-current"
            record.source_type = "account"

        sunrise_hour = 7 if day.month < 3 else 6
        sunset_hour = 17 if day.month < 3 else 19
        _upsert_daily_demo(
            db,
            WeatherData,
            day,
            sunrise_time=datetime(day.year, day.month, day.day, sunrise_hour, 15).time(),
            sunset_time=datetime(day.year, day.month, day.day, sunset_hour, 35).time(),
            daylight_hours=round((sunset_hour + 0.33) - (sunrise_hour + 0.25), 1),
            temperature_high_c=round(7 + progress * 8 + (r1 - 0.5) * 4, 1),
            temperature_low_c=round(1 + progress * 5 + (r2 - 0.5) * 3, 1),
            condition="cloudy" if r3 < 0.4 else "rainy" if r3 < 0.55 else "sunny",
            uv_index=round(1 + progress * 4 + r4 * 2, 1),
        )
        day_places = [DEMO_PLACES[0]]
        if not is_weekend:
            day_places += [DEMO_PLACES[8], DEMO_PLACES[1 if i % 4 else 2]]
        if workout_logged:
            day_places.append(DEMO_PLACES[3])
        if r5 > 0.5:
            day_places.append(DEMO_PLACES[4])
        if has_social_evening:
            day_places.append(DEMO_PLACES[5 if r4 > 0.45 else 9])
        if r2 > 0.62:
            day_places.append(DEMO_PLACES[6])
        if r3 > 0.64:
            day_places.append(DEMO_PLACES[7])
        day_places.append(DEMO_PLACES[0])

        _upsert_daily_demo(
            db,
            LocationDailySummary,
            day,
            home_hours=round(_lerp(16.5, 13.5, progress) + (r1 - 0.5) * 2.4, 2),
            gym_visits=1 if workout_logged and r2 > 0.45 else 0,
            social_venue_visits=1 if has_social_evening else 0,
            new_places_visited=max(0, round(r3 * (3 if is_weekend else 2))),
            commute_detected=(not is_weekend and r4 > 0.25),
            time_outdoors_minutes=max(20, round(_lerp(55, 110, progress) + (r5 - 0.5) * 45)),
        )
        base_hours = [7, 8, 10, 13, 17, 19, 21, 22]
        for idx, place in enumerate(day_places[: len(base_hours)]):
            _, _, _, _, lat, lng, _ = place
            arrive = datetime(day.year, day.month, day.day, base_hours[idx], (idx * 7) % 50)
            dwell = 35 if place[0] in {"station", "supermarket"} else 75 if place[0] not in {"home", "work", "university"} else 120
            _upsert_location_point(db, arrive, lat + (r1 - 0.5) * 0.00045, lng + (r2 - 0.5) * 0.00045, idx * 2)
            _upsert_location_point(db, arrive + timedelta(minutes=dwell), lat + (r3 - 0.5) * 0.00045, lng + (r4 - 0.5) * 0.00045, idx * 2 + 1)

        track_rotation = [
            DEMO_TRACKS[(i + offset * 3) % len(DEMO_TRACKS)]
            for offset in range(4)
        ]
        top_tracks = [
            {"name": name, "artist": artist, "plays": 1 + int(_seed(i * 19 + idx) * 5)}
            for idx, (name, artist, _) in enumerate(track_rotation)
        ]
        top_genres = list(dict.fromkeys([genre for _, _, genre in track_rotation]))[:3]
        _upsert_daily_demo(
            db,
            MusicData,
            day,
            listening_hours=round(0.8 + r2 * 1.7, 2),
            average_valence=round(0.35 + r3 * 0.4, 3),
            average_energy=round(0.4 + r4 * 0.45, 3),
            average_danceability=round(0.3 + r5 * 0.5, 3),
            new_discoveries=2 if r1 > 0.65 else 1,
            top_genres=top_genres,
            top_tracks=top_tracks,
            provider_breakdown={
                "spotify": {
                    "label": "Spotify",
                    "listeningHours": round(0.8 + r2 * 1.7, 2),
                    "averageValence": round(0.35 + r3 * 0.4, 3),
                    "averageEnergy": round(0.4 + r4 * 0.45, 3),
                    "averageDanceability": round(0.3 + r5 * 0.5, 3),
                    "newDiscoveries": 2 if r1 > 0.65 else 1,
                    "topGenres": top_genres,
                    "topTracks": top_tracks,
                },
                "youtube": {
                    "label": "YouTube",
                    "totalHours": round(0.9 + r4 * 2.1, 2),
                    "educational": round(0.3 + r2 * 1.4, 2),
                    "entertainment": round(0.4 + r3 * 1.6, 2),
                    "music": round(0.1 + r5 * 0.6, 2),
                    "other": round(0.1 + r1 * 0.4, 2),
                },
            },
        )

        recovery_boost = 0.35 if sleep_quality >= 7 and steps >= 7500 else 0
        mood = int(max(1, min(5, round(3.2 + (0.24 * (sleep_quality - 6.5)) + recovery_boost + (0.35 if r3 > 0.62 else -0.3 if r3 < 0.25 else 0) + (-0.8 if dow == 0 else 0.7 if dow == 4 else 0) + (r4 - 0.5) * 0.7))))
        energy = int(max(1, min(5, round(3 + (sleep_duration - 6.8) * 0.55 + min(steps / 12000, 1) * 0.45 + (r2 - 0.5) * 0.5))))
        one_words = ["tired", "okay", "hopeful", "anxious", "good", "stressed", "calm"]
        _upsert_daily_demo(
            db,
            DailyCheckIn,
            day,
            timestamp=int(datetime(day.year, day.month, day.day, 8, 0).timestamp() * 1000),
            emotional_state=mood,
            energy_level=energy,
            one_word=one_words[i % len(one_words)] if r5 > 0.4 else None,
        )

        companion_log = db.scalar(select(LocationCompanionLog).where(LocationCompanionLog.date == day))
        if not companion_log and has_social_evening:
            companion_log = LocationCompanionLog(date=day)
            db.add(companion_log)
        if companion_log:
            companion_log.person_ids = ["alex"] if has_social_evening else []
            companion_log.context_label = "social evening" if has_social_evening else None
            companion_log.note = "Seeded demo companion context"

    for person in RELATIONSHIP_PEOPLE:
        existing = db.get(Relationship, person["id"])
        if not existing:
            existing = Relationship(id=person["id"])
            db.add(existing)
        existing.name = person["name"]
        existing.type = person["type"]
        existing.tier = person["tier"]
        existing.desired_frequency_days = person["desired_frequency_days"]
        existing.avatar_colour = person["avatar_colour"]
        existing.active = True

    for habit in DEFAULT_HABITS:
        existing = db.get(Habit, habit["id"])
        if existing:
            existing.name = habit["name"]
            existing.action_text = habit.get("action_text")
            existing.when_text = habit.get("when_text")
            existing.why_text = habit.get("why_text")
            existing.habit_mode = habit.get("habit_mode")
            existing.cadence_type = habit.get("cadence_type")
            existing.target_count = habit.get("target_count")
            existing.sub_label = habit.get("sub_label")
            existing.category = habit["category"]
            existing.category_icon = habit["category_icon"]
            existing.habit_type = habit["habit_type"]
            existing.unit = habit.get("unit")
            existing.frequency = habit["frequency"]
        else:
            db.add(Habit(**habit))

    db.flush()
    habits = {habit.id: habit for habit in db.scalars(select(Habit)).all()}
    people = {person.id: person for person in db.scalars(select(Relationship)).all()}

    for i in range(90):
        day = start + timedelta(days=i)
        dow = day.weekday()
        is_weekend = dow >= 5
        progress = i / 89
        r1 = _seed(i * 101 + 1)
        r2 = _seed(i * 103 + 2)
        r3 = _seed(i * 107 + 3)
        r4 = _seed(i * 109 + 4)
        r5 = _seed(i * 113 + 5)
        r6 = _seed(i * 127 + 6)
        r7 = _seed(i * 131 + 7)

        values: dict[str, tuple[bool | None, float | None, int | None]] = {
            "racket-sport": (is_weekend and r1 > 0.78, None, None),
            "team-sport": ((not is_weekend) and r2 > 0.91, None, None),
            "running": ((not is_weekend) and r3 > 0.84, None, None),
            "passive-exercise": ((is_weekend and r4 > 0.62) or ((not is_weekend) and r4 > 0.88), None, None),
            "cad": ((not is_weekend) and r5 > 0.72, None, None),
            "computer-science": ((not is_weekend) and r6 > 0.58, None, None),
            "read-pages": (None, float(max(0, round((r5 > 0.58 and (8 + r6 * 18)) or (r6 * 5)))) , None),
            "audiobooks": (r7 > 0.68, None, None),
            "watch-episodes": ((is_weekend and r2 > 0.45) or ((not is_weekend) and r2 > 0.78), None, None),
            "listen-music": (r3 > 0.22, None, None),
            "facetime": (r4 > (0.48 if is_weekend else 0.62), None, None),
            "irl": (r3 > (0.4 if is_weekend else 0.7), None, None),
            "post": (r5 > 0.7, None, None),
            "cook": ((i % 14) == 3, None, None),
            "clean": ((i % 14) == 10, None, None),
            "journal": (r6 > 0.78, None, None),
            "plan-week": (dow == 6, None, None),
            "sleep-before-12": (r1 > _lerp(0.62, 0.42, progress), None, None),
            "wake-7am": (r2 > (0.35 if not is_weekend else 0.74), None, None),
            "smoke-limit": (None, float(round(((0.3 + r2 * 0.4) if r7 > 0.88 else (0.1 + r2 * 0.15) if r7 > 0.7 else 0) * 10) / 10), None),
            "quit-snus": (None, float(0 if r7 > 0.7 else 1 if r7 > 0.35 else 2), None),
            "alcohol": (None, float(0 if r2 > 0.78 else 1 if is_weekend and r2 > 0.42 else 0), None),
            "weed": (None, float(0 if r4 > 0.72 else 1 if r4 > 0.38 else 2 if is_weekend and r4 > 0.24 else 0), None),
            "masturbate": (None, float(0 if r6 > 0.74 else 1 if r6 > 0.38 else 2), None),
        }
        for habit_id, (completed, numeric_value, scale_value) in values.items():
            log = db.scalar(select(HabitLog).where(HabitLog.habit_id == habits[habit_id].id, HabitLog.date == day))
            if not log:
                log = HabitLog(habit_id=habits[habit_id].id, date=day)
                db.add(log)
            log.completed = completed
            log.numeric_value = numeric_value
            log.scale_value = scale_value

        interaction_time = datetime(day.year, day.month, day.day, 18, 0)
        categories = daily_categories[day]
        has_social_evening = daily_social_evenings[day]
        alex_id = f"demo-interaction-{day.isoformat()}-alex"
        alex_interaction = db.get(RelationshipInteraction, alex_id)
        if r1 > (0.2 if i > 55 else 0.35) or categories["social"] > 12:
            if not alex_interaction:
                alex_interaction = RelationshipInteraction(id=alex_id)
                db.add(alex_interaction)
            alex_interaction.date = day
            alex_interaction.timestamp = int(interaction_time.timestamp() * 1000)
            alex_interaction.person_ids = [people["alex"].id]
            alex_interaction.interaction_type = "in_person" if categories["social"] > 12 or has_social_evening or is_weekend else "phone"
            alex_interaction.presence_score = 5 if categories["social"] > 12 or is_weekend else 4
            alex_interaction.feeling_word = "grounded"
        if r2 > 0.52:
            mum_id = f"demo-interaction-{day.isoformat()}-mum"
            mum_interaction = db.get(RelationshipInteraction, mum_id)
            if not mum_interaction:
                mum_interaction = RelationshipInteraction(id=mum_id)
                db.add(mum_interaction)
            mum_interaction.date = day
            mum_interaction.timestamp = int(datetime(day.year, day.month, day.day, 12, 0).timestamp() * 1000)
            mum_interaction.person_ids = [people["mum"].id]
            mum_interaction.interaction_type = "phone" if is_weekend else "message"
            mum_interaction.presence_score = 4 if is_weekend else 3
            mum_interaction.feeling_word = "steady" if r2 > 0.78 else None

    if not db.scalar(select(AIConversation.id).limit(1)):
        conversation = AIConversation(
            ai_provider="local-qwen",
            ai_model="qwen3.5:35b",
            total_tokens_used=860,
            total_cost_pence=0,
        )
        db.add(conversation)
        db.flush()
        db.add_all(
            [
                AIMessage(conversation_id=conversation.id, role="assistant", content="Midweek check-in. Wednesday tends to be your lowest mood day in the data. Is that tracking with how you're feeling right now?", frameworks_referenced=["CBT"], cost_pence=0),
                AIMessage(conversation_id=conversation.id, role="user", content="A bit flat, honestly.", cost_pence=0),
                AIMessage(conversation_id=conversation.id, role="assistant", content="That fits the pattern in your recent week: shorter sleep on Tuesday night, then lower energy today. What feels most draining right now?", frameworks_referenced=["CBT"], cost_pence=0, tokens_used=430),
            ]
        )

    month_start = date.today().replace(day=1)
    if not db.scalar(select(MonthlyBudget).where(MonthlyBudget.month == month_start).limit(1)):
        db.add(
            MonthlyBudget(
                month=month_start,
                limit_pence=1000,
                spent_pence=240,
                auto_switch_at_80=True,
                disable_paid_at_limit=True,
            )
        )
    if not db.scalar(select(UserProfile.id).limit(1)):
        db.add(
            UserProfile(
                profile_document=(
                    "## Personal Context\nA reflective person using Therapist OS to build steadier routines across sleep, movement, spending, and self-check-ins.\n\n"
                    "## Core Patterns\nSleep quality improves when evenings are protected. Social movement boosts mood and next-day energy. Unplanned social spend is the main budget leak.\n\n"
                    "## Psychological Profile\nCBT lands well when tied to concrete patterns. SDT framing around autonomy and relatedness is motivating.\n\n"
                    "## Active Goals\nBuild sustainable sleep habits.\nStay more deliberate with social spending.\nProtect movement as a baseline.\n\n"
                    "## Important Relationships\nClose connection and movement reinforce each other strongly.\n\n"
                    "## What Works For Them\nWalking before demanding work. Morning check-ins. Structuring evenings.\n\n"
                    "## Current Focus Areas\nConsistency over intensity.\n\n"
                    "## Data Baselines\nSleep around 7.1h. Steps around 8,500. Mood roughly 6-7/10."
                ),
                key_themes=["sleep consistency", "social movement", "budget awareness"],
                active_goals=["Protect sleep", "Stay deliberate with spending", "Keep workouts regular"],
                notable_patterns=[
                    "Mood tends to dip midweek when sleep shortens the night before.",
                    "Social days tend to produce both higher steps and higher spend.",
                    "Movement is more stable when it is scheduled early.",
                ],
                health_baseline={"sleep_hours": 7.1, "steps": 8500, "resting_hr": 60},
                mood_baseline=6.6,
            )
        )
    if not db.scalar(
        select(RelationshipScreenshotImport.id).where(
            RelationshipScreenshotImport.source == "snapchat_best_friends",
        ).limit(1)
    ):
        db.add(
            RelationshipScreenshotImport(
                source="snapchat_best_friends",
                filename="demo-best-friends.png",
                mime_type="image/png",
                file_size_bytes=184320,
                captured_at=datetime.combine(end - timedelta(days=2), datetime.min.time()).replace(hour=18, minute=40),
                matched_person_ids=["alex", "jamie"],
                detected_labels=["Alex", "Jamie"],
                note="Seeded Snapchat import for demo mode.",
            )
        )
    if not db.get(DataSourceConnection, "garmin"):
        db.add(
            DataSourceConnection(
                source_id="garmin",
                display_name="Garmin Connect",
                category="Body - Steps, Sleep, HRV, Workouts",
                connected=False,
                available=False,
                connection_hint="Add GARMIN_EMAIL and GARMIN_PASSWORD on the backend to enable sync.",
            )
        )
    if not db.get(DataSourceConnection, "truelayer"):
        db.add(
            DataSourceConnection(
                source_id="truelayer",
                display_name="TrueLayer (Bank)",
                category="Finance - Transactions, Spending Categories",
                connected=False,
                available=False,
                connection_hint="Complete the TrueLayer OAuth setup on the backend to enable bank sync.",
            )
        )

    garmin_rows = db.scalar(select(func.count()).select_from(HealthData)) or 0
    _upsert_demo_sync_attempt(
        db,
        source_id="garmin",
        rows_synced=garmin_rows,
        attempted_at=attempted_at if "garmin" in attempt_sources else None,
        detail=f"Demo health dataset refreshed through {end.isoformat()}.",
        trigger=attempt_trigger,
    )

    truelayer_rows = db.scalar(select(func.count()).select_from(FinanceData)) or 0
    _upsert_demo_sync_attempt(
        db,
        source_id="truelayer",
        rows_synced=truelayer_rows,
        attempted_at=attempted_at if "truelayer" in attempt_sources else None,
        detail=f"Demo finance dataset refreshed through {end.isoformat()}.",
        trigger=attempt_trigger,
    )

    spotify_rows = db.scalar(select(func.count()).select_from(MusicData)) or 0
    _upsert_demo_sync_attempt(
        db,
        source_id="spotify",
        rows_synced=spotify_rows,
        attempted_at=attempted_at if "spotify" in attempt_sources else None,
        detail=f"Demo Spotify dataset refreshed through {end.isoformat()}.",
        trigger=attempt_trigger,
    )
    _upsert_demo_sync_attempt(
        db,
        source_id="youtube",
        rows_synced=spotify_rows,
        attempted_at=attempted_at if "youtube" in attempt_sources else None,
        detail=f"Demo YouTube dataset refreshed through {end.isoformat()}.",
        trigger=attempt_trigger,
    )

    weather_rows = db.scalar(select(func.count()).select_from(WeatherData)) or 0
    _upsert_demo_sync_attempt(
        db,
        source_id="weather",
        rows_synced=weather_rows,
        attempted_at=attempted_at if "weather" in attempt_sources else None,
        detail=f"Demo weather dataset refreshed through {end.isoformat()}.",
        trigger=attempt_trigger,
    )

    owntracks_rows = (
        (db.scalar(select(func.count()).select_from(LocationData)) or 0)
        + (db.scalar(select(func.count()).select_from(LocationDailySummary)) or 0)
        + (db.scalar(select(func.count()).select_from(LocationCompanionLog)) or 0)
    )
    _upsert_demo_sync_attempt(
        db,
        source_id="owntracks",
        rows_synced=owntracks_rows,
        attempted_at=attempted_at if "owntracks" in attempt_sources else None,
        detail=f"Demo location dataset refreshed through {end.isoformat()}.",
        trigger=attempt_trigger,
    )

    db.commit()
