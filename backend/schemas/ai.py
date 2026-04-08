from pydantic import BaseModel


class ProviderSchema(BaseModel):
    id: str
    name: str
    model: str
    costPerSession: str
    costRaw: int
    tier: str
    capabilities: list[str]
    isAvailable: bool


class OpeningMessageSchema(BaseModel):
    message: str


class ConversationCreateSchema(BaseModel):
    provider: str
    context: str | None = None
    model: str | None = None


class MessageRequestSchema(BaseModel):
    message: str
    conversation_id: str | None = None
    provider: str
    model: str | None = None


class TTSRequestSchema(BaseModel):
    text: str
    provider: str | None = None
    voice: str | None = None


class AIRuntimeOptionsSchema(BaseModel):
    localModels: list[str]
    defaultModel: str
    ttsProviders: list[str]
    defaultTtsProvider: str
    defaultTtsVoice: str
    ttsVoices: dict[str, list[str]]


class MessageSchema(BaseModel):
    id: str
    role: str
    content: str
    createdAt: str
    frameworksReferenced: list[str] | None = None
    costPence: int | None = None


class ConversationSchema(BaseModel):
    id: str
    startedAt: str
    endedAt: str | None = None
    sessionType: str
    provider: str
    model: str
    totalTokensUsed: int
    totalCostPence: int
    messages: list[MessageSchema]


class ConversationStartSchema(BaseModel):
    id: str
    openingMessage: MessageSchema | None = None


class AIResponseSchema(BaseModel):
    content: str
    provider: str
    model: str
    tokensUsed: int | None = None
    costPence: int | None = None
    frameworksReferenced: list[str] | None = None
    conversationId: str
    sessionCostPence: int


class TranscriptionSchema(BaseModel):
    text: str


class LiveSessionSchema(BaseModel):
    clientSecret: str
    model: str
    voice: str
    estimatedCostPerMinutePence: int
    warning: str
