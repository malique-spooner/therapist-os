from pydantic import BaseModel


class DailyCheckInSchema(BaseModel):
    date: str
    timestamp: int
    emotionalState: int
    energyLevel: int
    oneWord: str | None = None


class DailyCheckInCreateSchema(BaseModel):
    emotionalState: int
    energyLevel: int
    oneWord: str | None = None
