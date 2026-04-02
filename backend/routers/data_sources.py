from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..schemas.data_sources import DataSourceActionSchema, DataSourceSchema
from ..services.data_sources import DataSourceService

router = APIRouter(prefix="/data-sources", tags=["data-sources"], dependencies=[Depends(verify_api_key)])
service = DataSourceService()


@router.get("", response_model=list[DataSourceSchema])
def get_data_sources(db: Session = Depends(get_db)) -> list[dict]:
    return service.list_sources(db)


@router.post("/{source_id}/connect", response_model=DataSourceActionSchema)
def connect_data_source(source_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        source = service.connect(source_id, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown data source") from exc

    detail = "Data source connected" if source["connected"] else (source["connectionHint"] or "Data source is not ready")
    return {"detail": detail, "source": source}


@router.post("/{source_id}/sync", response_model=DataSourceActionSchema)
async def sync_data_source(source_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        source = await service.sync(source_id, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown data source") from exc

    status = source.get("lastSyncStatus")
    detail = "Data source synced" if status == "success" else (source.get("lastError") or source.get("connectionHint") or "Sync unavailable")
    return {"detail": detail, "source": source}


@router.delete("/{source_id}", response_model=DataSourceActionSchema)
def disconnect_data_source(source_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        source = service.disconnect(source_id, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown data source") from exc
    return {"detail": "Data source disconnected", "source": source}
