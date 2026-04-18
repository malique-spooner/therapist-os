from pydantic import BaseModel


class DayFinanceSchema(BaseModel):
    date: str
    totalSpend: int
    eatingOut: int
    groceries: int
    transport: int
    entertainment: int
    social: int
    other: int
