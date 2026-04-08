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
)
from ..schemas.open_prompts import LocationCompanionUpdateSchema
from ..services.data_mode import dataset_model
from ..services.data_sources import DataSourceService
from ..services.location_summary import LocationSummaryService
from ..services.periods import date_window

router = APIRouter(prefix="/location", tags=["location"])
summary_service = LocationSummaryService()
data_source_service = DataSourceService()


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

    if expected_username and expected_password:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing OwnTracks credentials")
        try:
            import base64

            scheme, encoded = authorization.split(" ", 1)
            if scheme.lower() != "basic":
                raise ValueError("Unsupported auth scheme")
            decoded = base64.b64decode(encoded).decode("utf-8")
            username, password = decoded.split(":", 1)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=401, detail="Invalid OwnTracks credentials") from exc
        if not (secrets.compare_digest(username, expected_username) and secrets.compare_digest(password, expected_password)):
            raise HTTPException(status_code=401, detail="Invalid OwnTracks credentials")
    elif settings.OWNTRACKS_SECRET and x_owntracks_secret != settings.OWNTRACKS_SECRET:
        raise HTTPException(status_code=401, detail="Invalid OwnTracks secret")

    if payload.get("_type") != "location":
        raise HTTPException(status_code=400, detail="Unsupported OwnTracks payload")

    tst = payload.get("tst")
    if tst is None:
        raise HTTPException(status_code=400, detail="Missing timestamp")

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
    data_source_service.mark_sync_result("owntracks", success=True, db=db)

    return {"detail": "Location received"}
