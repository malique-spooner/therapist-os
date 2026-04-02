from pydantic import BaseModel


class AppOpenPromptSchema(BaseModel):
    promptKey: str
    category: str
    title: str
    question: str
    supportingText: str
    primaryLabel: str
    targetPage: str
    targetDate: str | None = None
    personIds: list[str] | None = None


class LocationCompanionSchema(BaseModel):
    date: str
    personIds: list[str]
    contextLabel: str | None = None
    note: str | None = None


class LocationCompanionUpdateSchema(BaseModel):
    personIds: list[str]
    contextLabel: str | None = None
    note: str | None = None
