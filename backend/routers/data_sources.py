from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..schemas.data_sources import (
    DataSourceActionSchema,
    DataSourceActivityResponseSchema,
    DataSourceAuthorizeSchema,
    DataSourceOAuthCallbackSchema,
    DataSourceSchema,
    DataSourceSetupSchema,
    DataSourceSetupUpdateSchema,
)
from ..services.data_sources import DataSourceService

router = APIRouter(prefix="/data-sources", tags=["data-sources"], dependencies=[Depends(verify_api_key)])
service = DataSourceService()


@router.get("", response_model=list[DataSourceSchema])
def get_data_sources(db: Session = Depends(get_db)) -> list[dict]:
    return service.list_sources(db)


@router.get("/activity", response_model=DataSourceActivityResponseSchema)
def get_data_source_activity(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    return service.get_activity(mode, db)


@router.get("/{source_id}/setup", response_model=DataSourceSetupSchema)
def get_data_source_setup(source_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        return service.get_setup(source_id, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown data source") from exc


@router.post("/{source_id}/setup", response_model=DataSourceActionSchema)
def save_data_source_setup(source_id: str, payload: DataSourceSetupUpdateSchema, db: Session = Depends(get_db)) -> dict:
    try:
        source = service.save_setup(source_id, payload.values, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown data source") from exc

    detail = "Data source connected" if source["connected"] else (source["connectionHint"] or "Data source details saved")
    return {"detail": detail, "source": source}


@router.post("/{source_id}/authorize", response_model=DataSourceAuthorizeSchema)
def begin_data_source_authorization(source_id: str, db: Session = Depends(get_db)) -> dict:
    try:
      url = service.begin_authorization(source_id, db)
    except KeyError as exc:
      raise HTTPException(status_code=404, detail="Unknown data source") from exc
    except RuntimeError as exc:
      raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"url": url}


@router.post("/{source_id}/oauth/callback", response_model=DataSourceActionSchema)
async def complete_data_source_authorization(source_id: str, payload: DataSourceOAuthCallbackSchema, db: Session = Depends(get_db)) -> dict:
    try:
        source = await service.complete_authorization(source_id, payload.code, payload.state, payload.error, db)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown data source") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    detail = "Data source connected" if source["connected"] else (source["connectionHint"] or "Authorization completed")
    return {"detail": detail, "source": source}


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
        source = await service.sync(source_id, db, trigger="manual")
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
