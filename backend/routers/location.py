from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import (
    LocationCompanionLogDemo,
    LocationCompanionLogReal,
    LocationDailySummaryDemo,
    LocationDailySummaryReal,
    LocationDataDemo,
    LocationDataReal,
    LocationEventDemo,
    LocationEventReal,
    LocationPlaceMemoryDemo,
    LocationPlaceMemoryReal,
)
from ..schemas.location import (
    LocationCompanionUpdateSchema,
    LocationIntelligenceResponseSchema,
    LocationPlaceHistorySchema,
    LocationPlaceMemorySchema,
    LocationPlaceMemoryUpdateSchema,
    LocationPlaceMergeSchema,
    LocationPlaceSplitSchema,
)
from ..services.data_mode import dataset_model
from ..services.data_sources import DataSourceService
from ..services.location_intelligence import LocationIntelligenceService
from ..services.location_summary import LocationSummaryService
from ..services.periods import date_window

router = APIRouter(prefix="/location", tags=["location"])
summary_service = LocationSummaryService()
data_source_service = DataSourceService()
location_intelligence_service = LocationIntelligenceService()


def _serialize_point(point) -> dict:
    return {
        "timestamp": point.timestamp.isoformat(),
        "latitude": point.latitude,
        "longitude": point.longitude,
        "accuracy": point.accuracy,
        "batteryLevel": point.battery_level,
    }


def _serialize_summary(row) -> dict:
    return {
        "date": row.date.isoformat(),
        "homeHours": row.home_hours or 0,
        "gymVisits": row.gym_visits,
        "socialVenueVisits": row.social_venue_visits,
        "newPlacesVisited": row.new_places_visited,
        "commuteDetected": row.commute_detected,
        "timeOutdoorsMinutes": row.time_outdoors_minutes or 0,
    }


def _serialize_companion_log(row) -> dict:
    return {
        "date": row.date.isoformat(),
        "personIds": row.person_ids or [],
        "contextLabel": row.context_label,
        "note": row.note,
    }


def _serialize_place_memory(row) -> dict:
    return {
        "placeKey": row.place_key,
        "label": row.label,
        "category": row.category,
        "tone": row.tone,
        "note": row.note,
    }


@router.get("", dependencies=[Depends(verify_api_key)])
def get_location(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    start_dt = datetime(start.year, start.month, start.day)
    end_dt = datetime(end.year, end.month, end.day, 23, 59, 59)
    point_model = dataset_model(mode, LocationDataReal, LocationDataDemo)
    rows = db.scalars(
        select(point_model)
        .where(point_model.timestamp.between(start_dt, end_dt))
        .order_by(point_model.timestamp)
    ).all()
    return [_serialize_point(row) for row in rows]


@router.get("/today", dependencies=[Depends(verify_api_key)])
def get_location_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    summary_model = dataset_model(mode, LocationDailySummaryReal, LocationDailySummaryDemo)
    row = db.scalar(
        select(summary_model)
        .order_by(summary_model.date.desc())
    )
    if not row:
        raise HTTPException(status_code=404, detail="Location data not available")
    return _serialize_summary(row)


@router.get("/summary", dependencies=[Depends(verify_api_key)])
def get_location_summary(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    summary_model = dataset_model(mode, LocationDailySummaryReal, LocationDailySummaryDemo)
    rows = db.scalars(
        select(summary_model)
        .where(summary_model.date.between(start, end))
        .order_by(summary_model.date)
    ).all()
    return [_serialize_summary(row) for row in rows]


@router.get("/companions", dependencies=[Depends(verify_api_key)])
def get_location_companions(date: str, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    target_date = datetime.fromisoformat(date).date()
    companion_model = dataset_model(mode, LocationCompanionLogReal, LocationCompanionLogDemo)
    row = db.scalar(
        select(companion_model).where(companion_model.date == target_date)
    )
    if not row:
      return {"date": target_date.isoformat(), "personIds": [], "contextLabel": None, "note": None}
    return _serialize_companion_log(row)


@router.put("/companions", dependencies=[Depends(verify_api_key)])
def upsert_location_companions(date: str, payload: LocationCompanionUpdateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    target_date = datetime.fromisoformat(date).date()
    companion_model = dataset_model(mode or "real-only", LocationCompanionLogReal, LocationCompanionLogDemo)
    row = db.scalar(select(companion_model).where(companion_model.date == target_date))
    if not row:
        row = companion_model(date=target_date)
        db.add(row)

    row.person_ids = payload.personIds
    row.context_label = payload.contextLabel
    row.note = payload.note
    db.commit()
    db.refresh(row)
    return _serialize_companion_log(row)


@router.get("/places", dependencies=[Depends(verify_api_key)])
def get_location_places(mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    place_model = dataset_model(mode, LocationPlaceMemoryReal, LocationPlaceMemoryDemo)
    rows = db.scalars(select(place_model).order_by(place_model.updated_at.desc())).all()
    return [_serialize_place_memory(row) for row in rows]


@router.put("/places/{place_key}", dependencies=[Depends(verify_api_key)])
def upsert_location_place(place_key: str, payload: LocationPlaceMemoryUpdateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    return location_intelligence_service.upsert_place(place_key, payload.model_dump(), mode, db)


@router.get("/places/{place_key}/history", dependencies=[Depends(verify_api_key)], response_model=list[LocationPlaceHistorySchema])
def get_location_place_history(place_key: str, mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    return location_intelligence_service.get_place_history(place_key, mode, db)


@router.post("/places/{place_key}/merge", dependencies=[Depends(verify_api_key)], response_model=LocationPlaceMemorySchema)
def merge_location_place(place_key: str, payload: LocationPlaceMergeSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    try:
        return location_intelligence_service.merge_place(place_key, payload.targetPlaceKey, mode, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/places/{place_key}/split", dependencies=[Depends(verify_api_key)], response_model=LocationPlaceMemorySchema)
def split_location_place(place_key: str, payload: LocationPlaceSplitSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    try:
        return location_intelligence_service.split_place(place_key, payload.newPlaceKey, payload.label, mode, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/intelligence", dependencies=[Depends(verify_api_key)], response_model=LocationIntelligenceResponseSchema)
def get_location_intelligence(
    period: str | None = "this-week",
    date: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    mode: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    return location_intelligence_service.get_intelligence(period, date, startDate, endDate, mode, db)


@router.post("/owntracks")
async def owntracks_webhook(
    payload: dict,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_owntracks_secret: str | None = Header(default=None),
) -> dict:
    config = data_source_service.get_runtime_config("owntracks", db)
    expected_username = config.get("username")
    expected_password = config.get("password")

    def reject(status_code: int, detail: str) -> None:
        data_source_service.mark_sync_result("owntracks", success=False, db=db, error=detail, rows_synced=0)
        raise HTTPException(status_code=status_code, detail=detail)

    if expected_username and expected_password:
        if not authorization:
            reject(401, "Missing OwnTracks credentials")
        try:
            import base64

            scheme, encoded = authorization.split(" ", 1)
            if scheme.lower() != "basic":
                raise ValueError("Unsupported auth scheme")
            decoded = base64.b64decode(encoded).decode("utf-8")
            username, password = decoded.split(":", 1)
        except Exception as exc:  # noqa: BLE001
            reject(401, "Invalid OwnTracks credentials")
        if not (secrets.compare_digest(username, expected_username) and secrets.compare_digest(password, expected_password)):
            reject(401, "Invalid OwnTracks credentials")
    elif settings.OWNTRACKS_SECRET and x_owntracks_secret != settings.OWNTRACKS_SECRET:
        reject(401, "Invalid OwnTracks secret")

    tst = payload.get("tst")
    if tst is None:
        reject(400, "Missing timestamp")

    payload_type = payload.get("_type")
    if payload_type in {"transition", "waypoint", "region"}:
        event_model = dataset_model("real-only", LocationEventReal, LocationEventDemo)
        waypoint_name = payload.get("wtst") or payload.get("name") or payload.get("desc") or payload.get("regions")
        event = event_model(
            timestamp=datetime.fromtimestamp(int(tst), tz=UTC).replace(tzinfo=None),
            event_type=str(payload_type),
            trigger=payload.get("event") or payload.get("trigger") or payload.get("desc"),
            waypoint_name=waypoint_name,
            waypoint_id=payload.get("tid") or payload.get("waypoint") or payload.get("id") or payload.get("region"),
            latitude=float(payload["lat"]) if payload.get("lat") is not None else None,
            longitude=float(payload["lon"]) if payload.get("lon") is not None else None,
            radius=float(payload["rad"]) if payload.get("rad") is not None else None,
            raw_payload=payload,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        data_source_service.mark_sync_result("owntracks", success=True, db=db, rows_synced=1)
        return {"detail": "Location event received"}

    if payload_type != "location":
        reject(400, "Unsupported OwnTracks payload")

    point = LocationDataReal(
        timestamp=datetime.fromtimestamp(int(tst), tz=UTC).replace(tzinfo=None),
        latitude=float(payload["lat"]),
        longitude=float(payload["lon"]),
        accuracy=float(payload["acc"]) if payload.get("acc") is not None else None,
        battery_level=int(payload["batt"]) if payload.get("batt") is not None else None,
    )
    db.add(point)
    db.commit()
    db.refresh(point)

    await summary_service.summarise_day(point.timestamp.date(), db)
    data_source_service.mark_sync_result("owntracks", success=True, db=db, rows_synced=1)

    return {"detail": "Location received"}
