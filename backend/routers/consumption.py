from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import MusicData
from ..services.data_sources import DataSourceService
from ..services.ingestion.spotify import SpotifyIngestionService
from ..services.periods import date_window

router = APIRouter(prefix="/consumption", tags=["consumption"], dependencies=[Depends(verify_api_key)])
service = SpotifyIngestionService()
data_source_service = DataSourceService()


def _serialize_music(row: MusicData) -> dict:
    return {
        "date": row.date.isoformat(),
        "listeningHours": row.listening_hours or 0,
        "averageValence": row.average_valence,
        "averageEnergy": row.average_energy,
        "averageDanceability": row.average_danceability,
        "newDiscoveries": row.new_discoveries,
        "topGenres": row.top_genres or [],
        "topTracks": row.top_tracks or [],
    }


@router.get("")
def get_consumption(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(select(MusicData).where(MusicData.date.between(start, end)).order_by(MusicData.date)).all()
    return [_serialize_music(row) for row in rows]


@router.get("/today")
def get_consumption_today(db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(MusicData).order_by(MusicData.date.desc()))
    if not row:
        raise HTTPException(status_code=404, detail="Consumption data not available")
    return _serialize_music(row)


@router.post("/sync")
async def sync_consumption(db: Session = Depends(get_db)) -> dict:
    try:
        records = await service.sync_recent_listening(db)
    except RuntimeError as exc:
        data_source_service.mark_sync_result("spotify", success=False, db=db, error=str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    data_source_service.mark_sync_result("spotify", success=True, db=db)
    return {
        "detail": "Consumption synced",
        "daysSynced": len(records),
        "latestDate": records[-1].date.isoformat() if records else None,
    }
