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


class DataSourceAuthorizeSchema(BaseModel):
    url: str


class DataSourceOAuthCallbackSchema(BaseModel):
    code: str | None = None
    state: str | None = None
    error: str | None = None


class DataSourceSetupUpdateSchema(BaseModel):
    values: dict[str, str]
