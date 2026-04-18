from pydantic import BaseModel


class BrainDetectorSchema(BaseModel):
    id: str
    name: str
    description: str
    status: str
    versionAdded: str


class BrainModelSchema(BaseModel):
    id: str
    name: str
    purpose: str
    status: str
    versionAdded: str


class BrainLayerSchema(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    category: str
    status: str
    recentContribution: str
    detectors: list[BrainDetectorSchema] = []
    models: list[BrainModelSchema] = []


class BrainVersionSchema(BaseModel):
    id: str
    label: str
    dateLabel: str
    headline: str
    changes: list[str]
    state: str


class BrainOverviewSchema(BaseModel):
    version: str
    status: str
    lastRefresh: str
    macStatus: str
    privacyMode: str
    candidateSignals: int
    surfacedInsights: int
    totalLayers: int
    activeSystems: int


class BrainPayloadSchema(BaseModel):
    overview: BrainOverviewSchema
    layers: list[BrainLayerSchema]
    versions: list[BrainVersionSchema]
