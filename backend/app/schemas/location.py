from pydantic import BaseModel


class LocationCompanionUpdateSchema(BaseModel):
    personIds: list[str]
    contextLabel: str | None = None
    note: str | None = None


class LocationPlaceMemorySchema(BaseModel):
    placeKey: str
    label: str | None = None
    suggestedLabel: str | None = None
    category: str | None = None
    tone: str | None = None
    note: str | None = None
    confidenceScore: float | None = None
    status: str | None = None
    mergedIntoKey: str | None = None
    splitFromKey: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    visitCount: int | None = None
    totalMinutes: int | None = None
    averageDwellMinutes: int | None = None
    firstSeenAt: str | None = None
    lastSeenAt: str | None = None
    lastVisited: str | None = None
    historyCount: int | None = None
    insight: str | None = None


class LocationPlaceMemoryUpdateSchema(BaseModel):
    label: str | None = None
    category: str | None = None
    tone: str | None = None
    note: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class LocationPlaceMergeSchema(BaseModel):
    targetPlaceKey: str


class LocationPlaceSplitSchema(BaseModel):
    newPlaceKey: str
    label: str | None = None


class LocationVisitSchema(BaseModel):
    id: str
    placeKey: str
    placeLabel: str
    category: str
    startTimestamp: str
    endTimestamp: str
    dwellMinutes: int
    latitude: float
    longitude: float
    highlight: str
    tone: str
    confidenceScore: float | None = None
    correction: dict | None = None


class LocationTimelineRowSchema(BaseModel):
    id: str
    rowId: str
    kind: str
    label: str
    startTimestamp: str
    endTimestamp: str
    durationMinutes: int
    confidenceScore: float | None = None
    isLowConfidence: bool = False
    correction: dict | None = None
    placeKey: str | None = None
    placeLabel: str | None = None
    category: str | None = None
    movementType: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    startLatitude: float | None = None
    startLongitude: float | None = None
    endLatitude: float | None = None
    endLongitude: float | None = None
    distanceMetres: float | None = None
    averageSpeedKmh: float | None = None
    highlight: str | None = None
    tone: str | None = None


class LocationTimelineTagUpdateSchema(BaseModel):
    label: str | None = None
    category: str | None = None
    movementType: str | None = None
    tone: str | None = None
    note: str | None = None


class LocationRecapSceneSchema(BaseModel):
    id: str
    title: str
    description: str
    latitude: float
    longitude: float
    zoom: int
    heading: int
    tilt: int
    accent: str
    durationMs: int | None = None


class LocationRangeStatSchema(BaseModel):
    label: str
    value: str
    detail: str


class LocationPlaceHistorySchema(BaseModel):
    id: int
    placeKey: str
    action: str
    detail: dict | None = None
    createdAt: str


class LocationIntelligenceResponseSchema(BaseModel):
    mode: str
    hasRealMapData: bool
    heroTitle: str
    heroBody: str
    summaries: list[dict]
    selectedDay: dict | None = None
    points: list[dict]
    selectedDayPoints: list[dict]
    timeline: list[LocationTimelineRowSchema] = []
    visits: list[LocationVisitSchema]
    places: list[LocationPlaceMemorySchema]
    recapScenes: list[LocationRecapSceneSchema]
    rangeStats: list[LocationRangeStatSchema]
