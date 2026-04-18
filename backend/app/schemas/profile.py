from pydantic import BaseModel


class BudgetSchema(BaseModel):
    month: str
    limitPence: int
    spentPence: int
    autoSwitchAt80: bool
    disablePaidAtLimit: bool


class BudgetUpdateSchema(BaseModel):
    limitPence: int
    autoSwitchAt80: bool
    disablePaidAtLimit: bool


class ProfileSchema(BaseModel):
    profileDocument: str
    keyThemes: list[str]
    activeGoals: list[str]
    notablePatterns: list[str]
