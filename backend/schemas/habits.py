from pydantic import BaseModel


class HabitSchema(BaseModel):
    id: str
    name: str
    subLabel: str | None = None
    category: str
    categoryIcon: str
    type: str
    unit: str | None = None
    maxValue: int | None = None
    frequency: str


class HabitDaySchema(BaseModel):
    date: str
    values: dict[str, bool | float | int | None]


class HabitLogUpsert(BaseModel):
    habitId: str
    date: str | None = None
    value: bool | float | int


class HabitsOverviewSchema(BaseModel):
    habits: list[HabitSchema]
    todayCompletions: dict[str, bool | float | int | None]
    history: list[HabitDaySchema]
    weeklyCompletion: int
    streaks: dict[str, dict[str, int]]
