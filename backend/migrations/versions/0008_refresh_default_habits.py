"""refresh default habits

Revision ID: 0008_habit_refresh
Revises: 0007_rel_imports
Create Date: 2026-04-02 07:05:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_habit_refresh"
down_revision = "0007_rel_imports"
branch_labels = None
depends_on = None


OLD_HABIT_IDS = [
    "workout",
    "sleep-midnight",
    "budget",
    "mood",
    "water",
    "social",
    "meditation",
]

NEW_HABITS = [
    ("racket-sport", "Racket sport", "1x per week", "Movement", "🎾", "boolean", None, None, "1x per week"),
    ("team-sport", "Team sport", "1x per week", "Movement", "⚽", "boolean", None, None, "1x per week"),
    ("running", "Running", "1x per week", "Movement", "🏃", "boolean", None, None, "1x per week"),
    ("passive-exercise", "Passive exercise (cycling)", "1x per week", "Movement", "🚲", "boolean", None, None, "1x per week"),
    ("cad", "CAD", "2x per week", "Learning", "📐", "boolean", None, None, "2x per week"),
    ("computer-science", "Computer Science", "3x per week", "Learning", "💻", "boolean", None, None, "3x per week"),
    ("read-pages", "Read 25 pages", "per week", "Learning", "📚", "numeric", "pages", None, "25 pages per week"),
    ("audiobooks", "Listen to 6 audiobooks", "per year", "Learning", "🎧", "boolean", None, None, "6 per year"),
    ("watch-episodes", "Watch 2 episodes", "per week", "Media", "📺", "boolean", None, None, "2 per week"),
    ("listen-music", "Listen to music", "stay connected to sound", "Media", "🎵", "boolean", None, None, "daily"),
    ("facetime", "FaceTime", "5x per week", "Social", "📱", "boolean", None, None, "5x per week"),
    ("irl", "IRL", "1x per week", "Social", "🤝", "boolean", None, None, "1x per week"),
    ("post", "Post", "2 per week", "Social", "🪄", "boolean", None, None, "2 per week"),
    ("cook", "Cook", "1x biweekly", "Home", "🍳", "boolean", None, None, "biweekly"),
    ("clean", "Clean", "1x biweekly", "Home", "🧼", "boolean", None, None, "biweekly"),
    ("journal", "Journal", "1x per week", "Mind", "✍️", "boolean", None, None, "1x per week"),
    ("plan-week", "Plan week ahead", "weekly reset", "Mind", "🗓️", "boolean", None, None, "weekly"),
    ("sleep-before-12", "Sleep before 12", "4x per week", "Sleep", "🌙", "boolean", None, None, "4x per week"),
    ("wake-7am", "Wake up at 7am", "morning anchor", "Sleep", "⏰", "boolean", None, None, "daily"),
    ("smoke-limit", "Smoke 1g max", "per week", "Health", "🌿", "numeric", "g", None, "1g max per week"),
    ("quit-snus", "Quit Snus", "stay off it", "Health", "🚭", "boolean", None, None, "daily"),
]


def upgrade() -> None:
    habits = sa.table(
        "habits",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("sub_label", sa.String()),
        sa.column("category", sa.String()),
        sa.column("category_icon", sa.String()),
        sa.column("habit_type", sa.String()),
        sa.column("unit", sa.String()),
        sa.column("max_value", sa.Integer()),
        sa.column("frequency", sa.String()),
        sa.column("active", sa.Boolean()),
    )

    op.execute(
        habits.update()
        .where(habits.c.id.in_(OLD_HABIT_IDS))
        .values(active=False)
    )

    connection = op.get_bind()
    existing_ids = {row[0] for row in connection.execute(sa.select(habits.c.id))}

    for habit in NEW_HABITS:
        habit_id, name, sub_label, category, category_icon, habit_type, unit, max_value, frequency = habit
        if habit_id in existing_ids:
            op.execute(
                habits.update()
                .where(habits.c.id == habit_id)
                .values(
                    name=name,
                    sub_label=sub_label,
                    category=category,
                    category_icon=category_icon,
                    habit_type=habit_type,
                    unit=unit,
                    max_value=max_value,
                    frequency=frequency,
                    active=True,
                )
            )
        else:
            op.bulk_insert(
                habits,
                [
                    {
                        "id": habit_id,
                        "name": name,
                        "sub_label": sub_label,
                        "category": category,
                        "category_icon": category_icon,
                        "habit_type": habit_type,
                        "unit": unit,
                        "max_value": max_value,
                        "frequency": frequency,
                        "active": True,
                    }
                ],
            )


def downgrade() -> None:
    habits = sa.table(
        "habits",
        sa.column("id", sa.String()),
        sa.column("active", sa.Boolean()),
    )
    op.execute(
        habits.update()
        .where(habits.c.id.in_([habit[0] for habit in NEW_HABITS]))
        .values(active=False)
    )
    op.execute(
        habits.update()
        .where(habits.c.id.in_(OLD_HABIT_IDS))
        .values(active=True)
    )
