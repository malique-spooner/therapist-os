from pydantic import BaseModel


class HabitSchema(BaseModel):
    id: str
    name: str
    actionText: str | None = None
    whenText: str | None = None
    whyText: str | None = None
    habitMode: str | None = None
    cadenceType: str | None = None
    targetCount: int | None = None
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


class HabitUpsert(BaseModel):
    actionText: str
    whenText: str
    whyText: str
    habitMode: str
    cadenceType: str
    targetCount: int | None = None
    category: str | None = None
    categoryIcon: str | None = None
    type: str | None = None
    unit: str | None = None
    maxValue: int | None = None


class HabitsOverviewSchema(BaseModel):
    habits: list[HabitSchema]
    todayCompletions: dict[str, bool | float | int | None]
    history: list[HabitDaySchema]
    weeklyCompletion: int
    streaks: dict[str, dict[str, int]]
