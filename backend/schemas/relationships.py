from pydantic import BaseModel


class RelationshipSchema(BaseModel):
    id: str
    name: str
    type: str
    tier: str
    desiredFrequencyDays: int
    avatarColour: str | None = None


class RelationshipCreateSchema(BaseModel):
    name: str
    type: str
    tier: str
    desiredFrequencyDays: int


class RelationshipInteractionSchema(BaseModel):
    id: str
    date: str
    timestamp: int
    personIds: list[str]
    type: str
    presenceScore: int | None = None
    feelingWord: str | None = None


class RelationshipInteractionCreateSchema(BaseModel):
    personIds: list[str]
    type: str
    presenceScore: int | None = None
    feelingWord: str | None = None
