from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import MusicDataDemo, MusicDataReal
from ..services.data_mode import dataset_model
from ..services.data_sources import DataSourceService
from ..services.ingestion.spotify import SpotifyIngestionService
from ..services.periods import date_window

router = APIRouter(prefix="/consumption", tags=["consumption"], dependencies=[Depends(verify_api_key)])
data_source_service = DataSourceService()


def _spotify_service(db: Session) -> SpotifyIngestionService:
    return SpotifyIngestionService(data_source_service.get_runtime_config("spotify", db))


def _serialize_music(row) -> dict:
    provider_breakdown = row.provider_breakdown or {
        "spotify": {
            "label": "Spotify",
            "listeningHours": row.listening_hours or 0,
            "averageValence": row.average_valence,
            "averageEnergy": row.average_energy,
            "averageDanceability": row.average_danceability,
            "newDiscoveries": row.new_discoveries,
            "topGenres": row.top_genres or [],
            "topTracks": row.top_tracks or [],
        }
    }
    return {
        "date": row.date.isoformat(),
        "listeningHours": row.listening_hours or 0,
        "averageValence": row.average_valence,
        "averageEnergy": row.average_energy,
        "averageDanceability": row.average_danceability,
        "newDiscoveries": row.new_discoveries,
        "topGenres": row.top_genres or [],
        "topTracks": row.top_tracks or [],
        "providerBreakdown": provider_breakdown,
    }


@router.get("")
def get_consumption(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    model = dataset_model(mode, MusicDataReal, MusicDataDemo)
    rows = db.scalars(
        select(model)
        .where(model.date.between(start, end))
        .order_by(model.date)
    ).all()
    return [_serialize_music(row) for row in rows]


@router.get("/today")
def get_consumption_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    model = dataset_model(mode, MusicDataReal, MusicDataDemo)
    row = db.scalar(select(model).order_by(model.date.desc()))
    if not row:
        raise HTTPException(status_code=404, detail="Consumption data not available")
    return _serialize_music(row)


@router.post("/sync")
async def sync_consumption(db: Session = Depends(get_db)) -> dict:
    service = _spotify_service(db)
    try:
        result = await service.sync_recent_listening(db)
    except RuntimeError as exc:
        data_source_service.mark_sync_result("spotify", success=False, db=db, error=str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if isinstance(result, list):
        latest_row = max(result, key=lambda row: row.date, default=None)
        result = {
            "days_synced": len(result),
            "latest_date": latest_row.date.isoformat() if latest_row else None,
            "rows_synced": None,
            "cursor_ms": None,
        }
    data_source_service.mark_sync_result(
        "spotify",
        success=True,
        db=db,
        runtime_updates={"spotify_recent_after_ms": str(result.get("cursor_ms")) if result.get("cursor_ms") else None},
        rows_synced=result.get("rows_synced"),
    )
    return {
        "detail": "Consumption synced",
        "daysSynced": result.get("days_synced", 0),
        "latestDate": result.get("latest_date"),
        "playsSynced": result.get("rows_synced", 0),
    }
