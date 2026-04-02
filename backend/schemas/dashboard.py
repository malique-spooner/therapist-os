from pydantic import BaseModel


class RingSchema(BaseModel):
    label: str
    value: str
    unit: str
    percentage: int
    trend: str
    trendPositive: bool


class MiniTrendSchema(BaseModel):
    label: str
    data: list[float]
    latest: str
    unit: str
    invertTrend: bool = False


class InsightCardSchema(BaseModel):
    id: str
    category: str
    categoryIcon: str
    lens: str
    narrative: str
    action: str


class HeroInsightSchema(BaseModel):
    weekOf: str
    heroHeadline: str
    heroFramework: str
    cards: list[InsightCardSchema]


class DashboardResponseSchema(BaseModel):
    greeting: str
    dateLabel: str
    heroInsight: HeroInsightSchema
    rings: list[RingSchema]
    miniTrends: list[MiniTrendSchema]
    insights: list[InsightCardSchema]
