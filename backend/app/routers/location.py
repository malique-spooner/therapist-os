from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import (
    LocationCompanionLogReal,
    LocationDailySummaryReal,
    LocationDataReal,
    LocationEventReal,
    LocationPlaceMemoryReal,
)
from ..models.source_data import (
    OwnTracksDeviceEvent,
    OwnTracksLocationPoint,
    OwnTracksTransitionEvent,
    OwnTracksWaypoint,
)
from ..schemas.location import (
    LocationCompanionUpdateSchema,
    LocationIntelligenceResponseSchema,
    LocationPlaceHistorySchema,
    LocationPlaceMemorySchema,
    LocationPlaceMemoryUpdateSchema,
    LocationPlaceMergeSchema,
    LocationPlaceSplitSchema,
    LocationTimelineTagUpdateSchema,
)
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
        "velocity": getattr(point, "velocity", None),
        "motionActivities": getattr(point, "motion_activities", None) or [],
        "inRegions": getattr(point, "in_regions", None) or [],
        "inRegionIds": getattr(point, "in_region_ids", None) or [],
        "connection": getattr(point, "connection", None),
        "course": getattr(point, "course", None),
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


def _is_legacy_noise_place(row) -> bool:
    category = (getattr(row, "category", None) or "").lower()
    label = (getattr(row, "label", None) or "").lower()
    return category == "errands" or label.startswith("errand loop")


def _serialize_place_memory(row) -> dict:
    if _is_legacy_noise_place(row):
        return None
    label = row.label if row.category not in {"unknown_place", "errands"} else "Unknown place"
    category = "unknown_place" if row.category in {"unknown_place", "errands"} else row.category
    return {
        "placeKey": row.place_key,
        "label": label,
        "suggestedLabel": label,
        "category": category,
        "tone": row.tone,
        "note": row.note,
        "confidenceScore": row.confidence_score,
        "status": row.status,
        "mergedIntoKey": row.merged_into_key,
        "splitFromKey": row.split_from_key,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "visitCount": row.visit_count,
        "totalMinutes": row.total_minutes,
        "averageDwellMinutes": round((row.total_minutes or 0) / max(row.visit_count or 1, 1)) if row.total_minutes else 0,
        "firstSeenAt": row.first_seen_at.isoformat() if row.first_seen_at else None,
        "lastSeenAt": row.last_seen_at.isoformat() if row.last_seen_at else None,
    }


def _owntracks_hash(*parts: object) -> str:
    import hashlib

    return hashlib.sha256(repr(parts).encode("utf-8")).hexdigest()


def _upsert_source_row(db: Session, model, source_row_hash: str, **values):
    row = db.scalar(select(model).where(model.source_row_hash == source_row_hash))
    if not row:
        row = model(source_row_hash=source_row_hash, **values)
        db.add(row)
        db.flush()
    for key, value in values.items():
        setattr(row, key, value)
    return row


@router.get("", dependencies=[Depends(verify_api_key)])
def get_location(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    start_dt = datetime(start.year, start.month, start.day)
    end_dt = datetime(end.year, end.month, end.day, 23, 59, 59)
    rows = db.scalars(
        select(LocationDataReal)
        .where(LocationDataReal.timestamp.between(start_dt, end_dt))
        .order_by(LocationDataReal.timestamp)
    ).all()
    return [_serialize_point(row) for row in rows]


@router.get("/today", dependencies=[Depends(verify_api_key)])
def get_location_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(
        select(LocationDailySummaryReal)
        .order_by(LocationDailySummaryReal.date.desc())
    )
    if not row:
        raise HTTPException(status_code=404, detail="Location data not available")
    return _serialize_summary(row)


@router.get("/summary", dependencies=[Depends(verify_api_key)])
def get_location_summary(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(
        select(LocationDailySummaryReal)
        .where(LocationDailySummaryReal.date.between(start, end))
        .order_by(LocationDailySummaryReal.date)
    ).all()
    return [_serialize_summary(row) for row in rows]


@router.get("/companions", dependencies=[Depends(verify_api_key)])
def get_location_companions(date: str, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    target_date = datetime.fromisoformat(date).date()
    row = db.scalar(
        select(LocationCompanionLogReal).where(LocationCompanionLogReal.date == target_date)
    )
    if not row:
      return {"date": target_date.isoformat(), "personIds": [], "contextLabel": None, "note": None}
    return _serialize_companion_log(row)


@router.put("/companions", dependencies=[Depends(verify_api_key)])
def upsert_location_companions(date: str, payload: LocationCompanionUpdateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    target_date = datetime.fromisoformat(date).date()
    row = db.scalar(select(LocationCompanionLogReal).where(LocationCompanionLogReal.date == target_date))
    if not row:
        row = LocationCompanionLogReal(date=target_date)
        db.add(row)

    row.person_ids = payload.personIds
    row.context_label = payload.contextLabel
    row.note = payload.note
    db.commit()
    db.refresh(row)
    return _serialize_companion_log(row)


@router.get("/places", dependencies=[Depends(verify_api_key)])
def get_location_places(mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(LocationPlaceMemoryReal).order_by(LocationPlaceMemoryReal.updated_at.desc())).all()
    return [item for row in rows if (item := _serialize_place_memory(row)) is not None]


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


@router.put("/timeline/{row_id}/tag", dependencies=[Depends(verify_api_key)])
def tag_location_timeline_row(row_id: str, payload: LocationTimelineTagUpdateSchema, mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    try:
        return location_intelligence_service.tag_timeline_row(row_id, payload.model_dump(), mode, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


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
        waypoint_name = payload.get("wtst") or payload.get("name") or payload.get("desc") or payload.get("regions")
        waypoint_id = str(payload.get("tid") or payload.get("waypoint") or payload.get("id") or payload.get("region") or waypoint_name or "unknown")
        recorded_at = datetime.fromtimestamp(int(tst), tz=UTC).replace(tzinfo=None)
        event = LocationEventReal(
            timestamp=recorded_at,
            event_type=str(payload_type),
            trigger=payload.get("event") or payload.get("trigger") or payload.get("desc"),
            waypoint_name=waypoint_name,
            waypoint_id=waypoint_id,
            latitude=float(payload["lat"]) if payload.get("lat") is not None else None,
            longitude=float(payload["lon"]) if payload.get("lon") is not None else None,
            radius=float(payload["rad"]) if payload.get("rad") is not None else None,
            raw_payload=payload,
        )
        db.add(event)
        _upsert_source_row(
            db,
            OwnTracksWaypoint,
            _owntracks_hash("waypoint", waypoint_id),
            waypoint_id=waypoint_id,
            waypoint_name=waypoint_name or waypoint_id,
            latitude=float(payload["lat"]) if payload.get("lat") is not None else None,
            longitude=float(payload["lon"]) if payload.get("lon") is not None else None,
            radius=float(payload["rad"]) if payload.get("rad") is not None else None,
            category=str(payload_type),
            payload_json=payload,
        )
        _upsert_source_row(
            db,
            OwnTracksTransitionEvent,
            _owntracks_hash("transition", waypoint_id, tst, payload_type),
            occurred_at=recorded_at,
            device_id=payload.get("tid") or payload.get("device") or payload.get("topic"),
            waypoint_id=waypoint_id,
            waypoint_name=waypoint_name,
            transition=payload.get("event") or payload.get("trigger") or str(payload_type),
            latitude=float(payload["lat"]) if payload.get("lat") is not None else None,
            longitude=float(payload["lon"]) if payload.get("lon") is not None else None,
            radius=float(payload["rad"]) if payload.get("rad") is not None else None,
            payload_json=payload,
        )
        _upsert_source_row(
            db,
            OwnTracksDeviceEvent,
            _owntracks_hash("device-event", waypoint_id, tst, payload_type),
            occurred_at=recorded_at,
            device_id=payload.get("tid") or payload.get("device") or payload.get("topic"),
            event_type=str(payload_type),
            detail=payload.get("event") or payload.get("trigger") or payload.get("desc"),
            payload_json=payload,
        )
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
        velocity=float(payload["vel"]) if payload.get("vel") is not None else None,
        motion_activities=payload.get("motionactivities") if isinstance(payload.get("motionactivities"), list) else None,
        in_regions=payload.get("inregions") if isinstance(payload.get("inregions"), list) else None,
        in_region_ids=payload.get("inrids") if isinstance(payload.get("inrids"), list) else None,
        connection=str(payload.get("conn")) if payload.get("conn") is not None else None,
        course=float(payload["cog"]) if payload.get("cog") is not None else None,
    )
    db.add(point)
    _upsert_source_row(
        db,
        OwnTracksLocationPoint,
        _owntracks_hash("location", tst, payload.get("tid"), payload.get("lat"), payload.get("lon")),
        recorded_at=point.timestamp,
        device_id=payload.get("tid") or payload.get("device") or payload.get("topic"),
        latitude=point.latitude,
        longitude=point.longitude,
        accuracy=point.accuracy,
        battery_level=point.battery_level,
        status=payload_type,
        payload_json=payload,
    )
    db.commit()
    db.refresh(point)

    await summary_service.summarise_day(point.timestamp.date(), db)
    data_source_service.mark_sync_result("owntracks", success=True, db=db, rows_synced=1)

    return {"detail": "Location received"}
