from pydantic import BaseModel


class DataSourceSchema(BaseModel):
    id: str
    name: str
    category: str
    icon: str
    connected: bool
    available: bool
    connectionState: str | None = None
    lastSync: str | None = None
    lastSyncStatus: str | None = None
    folderPath: str | None = None
    connectionHint: str | None = None
    lastError: str | None = None
    syncBlocked: bool = False
    syncGuardMessage: str | None = None
    intendedSync: str | None = None
    manualSyncAllowed: bool = True


class DataSourceSyncAttemptSchema(BaseModel):
    id: int
    status: str
    trigger: str
    dataMode: str | None = None
    rowsSynced: int | None = None
    detail: str | None = None
    attemptedAt: str
    cooldownUntil: str | None = None


class DataSourceActionSchema(BaseModel):
    detail: str
    source: DataSourceSchema


class DataSourceSetupFieldSchema(BaseModel):
    key: str
    label: str
    type: str
    required: bool = True
    placeholder: str | None = None
    helpText: str | None = None
    hasValue: bool = False
    value: str | None = None


class DataSourceSetupSchema(BaseModel):
    id: str
    name: str
    mode: str
    title: str
    description: str
    instructions: list[str] = []
    actionLabel: str
    connected: bool
    available: bool
    fields: list[DataSourceSetupFieldSchema] = []
    webhookUrl: str | None = None
    callbackUrl: str | None = None
    folderPath: str | None = None
    canAuthorize: bool = False
    authActionLabel: str | None = None
    recentAttempts: list[DataSourceSyncAttemptSchema] = []
    intendedSync: str | None = None
    manualSyncAllowed: bool = True


class DataSourceActivityItemSchema(DataSourceSchema):
    recordsAvailable: int
    lastCollectedAt: str | None = None
    latestDataDate: str | None = None
    recentAttempts: list[DataSourceSyncAttemptSchema] = []


class DataSourceActivityResponseSchema(BaseModel):
    mode: str
    generatedAt: str
    items: list[DataSourceActivityItemSchema]


class DataSourceAuthorizeSchema(BaseModel):
    url: str


class DataSourceOAuthCallbackSchema(BaseModel):
    code: str | None = None
    state: str | None = None
    error: str | None = None


class DataSourceSetupUpdateSchema(BaseModel):
    values: dict[str, str]
