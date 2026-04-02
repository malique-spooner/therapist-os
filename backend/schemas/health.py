from pydantic import BaseModel


class DayHealthSchema(BaseModel):
    date: str
    steps: int
    sleepDuration: float
    sleepQuality: float
    hrv: float
    restingHR: int
    hadWorkout: bool
