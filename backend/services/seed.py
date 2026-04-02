from __future__ import annotations

from datetime import date, datetime, timedelta
from math import floor, sin

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AIConversation, AIMessage, DailyCheckIn, DataSourceConnection, FinanceData, Habit, HabitLog, HealthData, MonthlyBudget, MusicData, NutritionLog, Relationship, RelationshipInteraction, UserProfile, WeatherData

DEFAULT_HABITS = [
    {"id": "racket-sport", "name": "Racket sport", "sub_label": "1x per week", "category": "Movement", "category_icon": "🎾", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "team-sport", "name": "Team sport", "sub_label": "1x per week", "category": "Movement", "category_icon": "⚽", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "running", "name": "Running", "sub_label": "1x per week", "category": "Movement", "category_icon": "🏃", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "passive-exercise", "name": "Passive exercise (cycling)", "sub_label": "1x per week", "category": "Movement", "category_icon": "🚲", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "cad", "name": "CAD", "sub_label": "2x per week", "category": "Learning", "category_icon": "📐", "habit_type": "boolean", "frequency": "2x per week"},
    {"id": "computer-science", "name": "Computer Science", "sub_label": "3x per week", "category": "Learning", "category_icon": "💻", "habit_type": "boolean", "frequency": "3x per week"},
    {"id": "read-pages", "name": "Read 25 pages", "sub_label": "per week", "category": "Learning", "category_icon": "📚", "habit_type": "numeric", "unit": "pages", "frequency": "25 pages per week"},
    {"id": "audiobooks", "name": "Listen to 6 audiobooks", "sub_label": "per year", "category": "Learning", "category_icon": "🎧", "habit_type": "boolean", "frequency": "6 per year"},
    {"id": "watch-episodes", "name": "Watch 2 episodes", "sub_label": "per week", "category": "Media", "category_icon": "📺", "habit_type": "boolean", "frequency": "2 per week"},
    {"id": "listen-music", "name": "Listen to music", "sub_label": "stay connected to sound", "category": "Media", "category_icon": "🎵", "habit_type": "boolean", "frequency": "daily"},
    {"id": "facetime", "name": "FaceTime", "sub_label": "5x per week", "category": "Social", "category_icon": "📱", "habit_type": "boolean", "frequency": "5x per week"},
    {"id": "irl", "name": "IRL", "sub_label": "1x per week", "category": "Social", "category_icon": "🤝", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "post", "name": "Post", "sub_label": "2 per week", "category": "Social", "category_icon": "🪄", "habit_type": "boolean", "frequency": "2 per week"},
    {"id": "cook", "name": "Cook", "sub_label": "1x biweekly", "category": "Home", "category_icon": "🍳", "habit_type": "boolean", "frequency": "biweekly"},
    {"id": "clean", "name": "Clean", "sub_label": "1x biweekly", "category": "Home", "category_icon": "🧼", "habit_type": "boolean", "frequency": "biweekly"},
    {"id": "journal", "name": "Journal", "sub_label": "1x per week", "category": "Mind", "category_icon": "✍️", "habit_type": "boolean", "frequency": "1x per week"},
    {"id": "plan-week", "name": "Plan week ahead", "sub_label": "weekly reset", "category": "Mind", "category_icon": "🗓️", "habit_type": "boolean", "frequency": "weekly"},
    {"id": "sleep-before-12", "name": "Sleep before 12", "sub_label": "4x per week", "category": "Sleep", "category_icon": "🌙", "habit_type": "boolean", "frequency": "4x per week"},
    {"id": "wake-7am", "name": "Wake up at 7am", "sub_label": "morning anchor", "category": "Sleep", "category_icon": "⏰", "habit_type": "boolean", "frequency": "daily"},
    {"id": "smoke-limit", "name": "Smoke 1g max", "sub_label": "per week", "category": "Health", "category_icon": "🌿", "habit_type": "numeric", "unit": "g", "frequency": "1g max per week"},
    {"id": "quit-snus", "name": "Quit Snus", "sub_label": "stay off it", "category": "Health", "category_icon": "🚭", "habit_type": "boolean", "frequency": "daily"},
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


def seed_demo_data(db: Session) -> None:
    if db.scalar(select(HealthData.id).limit(1)):
        return

    start = date(2026, 1, 1)
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

        db.add(
            HealthData(
                date=day,
                steps=steps,
                sleep_duration_hours=round(sleep_duration, 1),
                sleep_quality=float(sleep_quality),
                hrv_ms=float(hrv),
                resting_hr=resting_hr,
                workout_logged=workout_logged,
                workout_type="gym" if workout_logged else None,
                workout_duration_minutes=45 if workout_logged else 0,
            )
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
        for category, amount in categories.items():
            db.add(
                FinanceData(
                    date=day,
                    amount_pence=amount * 100,
                    category=category,
                    merchant=category.replace("_", " ").title(),
                    description=f"Seeded {category} transaction",
                    transaction_id=f"{day.isoformat()}-{category}",
                )
            )

        sunrise_hour = 7 if day.month < 3 else 6
        sunset_hour = 17 if day.month < 3 else 19
        db.add(
            WeatherData(
                date=day,
                sunrise_time=datetime(day.year, day.month, day.day, sunrise_hour, 15).time(),
                sunset_time=datetime(day.year, day.month, day.day, sunset_hour, 35).time(),
                daylight_hours=round((sunset_hour + 0.33) - (sunrise_hour + 0.25), 1),
                temperature_high_c=round(7 + progress * 8 + (r1 - 0.5) * 4, 1),
                temperature_low_c=round(1 + progress * 5 + (r2 - 0.5) * 3, 1),
                condition="cloudy" if r3 < 0.4 else "rainy" if r3 < 0.55 else "sunny",
                uv_index=round(1 + progress * 4 + r4 * 2, 1),
            )
        )
        db.add(
            MusicData(
                date=day,
                listening_hours=round(0.8 + r2 * 1.7, 2),
                average_valence=round(0.35 + r3 * 0.4, 3),
                average_energy=round(0.4 + r4 * 0.45, 3),
                average_danceability=round(0.3 + r5 * 0.5, 3),
                new_discoveries=2 if r1 > 0.65 else 1,
                top_genres=["indie pop", "alt r&b", "ambient"] if r3 > 0.5 else ["indie rock", "electronic", "neo-soul"],
                top_tracks=[
                    {"name": "Seed Track A", "artist": "Artist One", "plays": 3},
                    {"name": "Seed Track B", "artist": "Artist Two", "plays": 2},
                ],
            )
        )

        breakfast = r1 > (0.4 if is_weekend else 0.23)
        lunch = r2 > 0.12
        dinner = True
        heavy_snacking = (not breakfast) and r3 > 0.45
        alcohol_units = max(0, min(4, round((2 + r4 * 2) if is_weekend and r4 > 0.45 else (1 + r4 * 2) if r4 > 0.82 else 0)))
        caffeine_count = max(0, min(4, round(1.2 + (7.1 - sleep_duration) + (r5 - 0.5) * 1.4)))
        caffeine_before_noon = True if caffeine_count == 0 else r5 > 0.35
        food_quality = int(max(1, min(3, round(2 + (1 if breakfast else 0) + (0.5 if lunch else -0.5) + (-0.7 if is_weekend else 0) + progress * 0.75 + (r1 - 0.5) * 0.9))))
        db.add(
            NutritionLog(
                date=day,
                breakfast=breakfast,
                lunch=lunch,
                dinner=dinner,
                heavy_snacking=heavy_snacking,
                food_quality=food_quality,
                caffeine_count=caffeine_count,
                caffeine_last_before_noon=caffeine_before_noon,
                alcohol_units=alcohol_units,
            )
        )

        mood = int(max(1, min(5, round(3.2 + (0.8 if breakfast else -0.5) + (0.24 * (sleep_quality - 6.5)) + (-0.45 if alcohol_units > 2 else 0) + (0.35 if r3 > 0.62 else -0.3 if r3 < 0.25 else 0) + (-0.8 if dow == 0 else 0.7 if dow == 4 else 0) + (r4 - 0.5) * 0.7))))
        energy = int(max(1, min(5, round(3 + (sleep_duration - 6.8) * 0.55 + (food_quality - 2) * 0.5 + (0.35 if breakfast else -0.55) + (r2 - 0.5) * 0.5))))
        one_words = ["tired", "okay", "hopeful", "anxious", "good", "stressed", "calm"]
        db.add(
            DailyCheckIn(
                date=day,
                timestamp=int(datetime(day.year, day.month, day.day, 8, 0).timestamp() * 1000),
                emotional_state=mood,
                energy_level=energy,
                one_word=one_words[i % len(one_words)] if r5 > 0.4 else None,
            )
        )

    for person in RELATIONSHIP_PEOPLE:
        db.add(Relationship(**person, active=True))

    for habit in DEFAULT_HABITS:
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
            "quit-snus": (r7 > 0.14, None, None),
        }
        for habit_id, (completed, numeric_value, scale_value) in values.items():
            db.add(
                HabitLog(
                    habit_id=habits[habit_id].id,
                    date=day,
                    completed=completed,
                    numeric_value=numeric_value,
                    scale_value=scale_value,
                )
            )

        interaction_time = datetime(day.year, day.month, day.day, 18, 0)
        if r1 > (0.2 if i > 55 else 0.35) or categories["social"] > 12:
            db.add(
                RelationshipInteraction(
                    id=f"interaction-{day.isoformat()}-alex",
                    date=day,
                    timestamp=int(interaction_time.timestamp() * 1000),
                    person_ids=[people["alex"].id],
                    interaction_type="in_person" if categories["social"] > 12 or is_weekend else "phone",
                    presence_score=5 if categories["social"] > 12 or is_weekend else 4,
                    feeling_word="grounded",
                )
            )
        if r2 > 0.52:
            db.add(
                RelationshipInteraction(
                    id=f"interaction-{day.isoformat()}-mum",
                    date=day,
                    timestamp=int(datetime(day.year, day.month, day.day, 12, 0).timestamp() * 1000),
                    person_ids=[people["mum"].id],
                    interaction_type="phone" if is_weekend else "message",
                    presence_score=4 if is_weekend else 3,
                    feeling_word="steady" if r2 > 0.78 else None,
                )
            )

    conversation = AIConversation(
        ai_provider="claude-sonnet",
        ai_model="claude-sonnet-4-6",
        total_tokens_used=860,
        total_cost_pence=24,
    )
    db.add(conversation)
    db.flush()
    db.add_all(
        [
            AIMessage(conversation_id=conversation.id, role="assistant", content="Midweek check-in. Wednesday tends to be your lowest mood day in the data. Is that tracking with how you're feeling right now?", frameworks_referenced=["CBT"], cost_pence=0),
            AIMessage(conversation_id=conversation.id, role="user", content="A bit flat, honestly.", cost_pence=0),
            AIMessage(conversation_id=conversation.id, role="assistant", content="That fits the pattern in your recent week: shorter sleep on Tuesday night, then lower energy today. What feels most draining right now?", frameworks_referenced=["CBT"], cost_pence=12, tokens_used=430),
        ]
    )

    month_start = date.today().replace(day=1)
    db.add(
        MonthlyBudget(
            month=month_start,
            limit_pence=1000,
            spent_pence=240,
            auto_switch_at_80=True,
            disable_paid_at_limit=True,
        )
    )
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
    db.add_all(
        [
            DataSourceConnection(
                source_id="garmin",
                display_name="Garmin Connect",
                category="Body - Steps, Sleep, HRV, Workouts",
                connected=False,
                available=False,
                connection_hint="Add GARMIN_EMAIL and GARMIN_PASSWORD on the backend to enable sync.",
            ),
            DataSourceConnection(
                source_id="truelayer",
                display_name="TrueLayer (Bank)",
                category="Finance - Transactions, Spending Categories",
                connected=False,
                available=False,
                connection_hint="Complete the TrueLayer OAuth setup on the backend to enable bank sync.",
            ),
        ]
    )
    db.commit()
