from pydantic import BaseModel


class DataSourceSchema(BaseModel):
    id: str
    name: str
    category: str
    icon: str
    connected: bool
    available: bool
    lastSync: str | None = None
    lastSyncStatus: str | None = None
    folderPath: str | None = None
    connectionHint: str | None = None
    lastError: str | None = None


class DataSourceActionSchema(BaseModel):
    detail: str
    source: DataSourceSchema
