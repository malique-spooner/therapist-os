from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models import RawDataImport


THERAPIST_OS_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1W-aD74h2TlVovpS5oWi8IUR-TC-0JHIAwDsIiIX9Ik4H5H3qovf8_0Qzms_MFXI_QVpsmm6i"

FILE_IMPORT_FOLDERS = {
    "garmin": "TherapistOS/Garmin",
    "revolut": "TherapistOS/Finance/Revolut",
    "natwest": "TherapistOS/Finance/NatWest",
    "instagram": "TherapistOS/People/Instagram",
    "snapchat": "TherapistOS/People/Snapchat",
    "youtube": "TherapistOS/Media/YouTube",
    "chrome": "TherapistOS/Media/Chrome",
}


@dataclass(frozen=True)
class DriveFileRef:
    source_id: str
    external_file_id: str
    file_name: str
    mime_type: str | None = None
    folder_path: str | None = None
    web_url: str | None = None
    size_bytes: int | None = None
    checksum: str | None = None
    modified_at: datetime | None = None
    raw_metadata: dict[str, Any] | None = None


class GoogleDriveImportService:
    def folder_for(self, source_id: str) -> str | None:
        return FILE_IMPORT_FOLDERS.get(source_id)

    def record_discovered_file(self, file_ref: DriveFileRef, db: Session) -> RawDataImport:
        existing = db.scalar(
            select(RawDataImport).where(
                RawDataImport.source_id == file_ref.source_id,
                RawDataImport.external_file_id == file_ref.external_file_id,
            )
        )
        record = existing or RawDataImport(
            source_id=file_ref.source_id,
            external_file_id=file_ref.external_file_id,
            file_name=file_ref.file_name,
        )
        record.file_name = file_ref.file_name
        record.mime_type = file_ref.mime_type
        record.folder_path = file_ref.folder_path or self.folder_for(file_ref.source_id)
        record.web_url = file_ref.web_url
        record.size_bytes = file_ref.size_bytes
        record.checksum = file_ref.checksum
        record.modified_at = file_ref.modified_at
        record.raw_metadata = file_ref.raw_metadata
        record.error = None
        if existing is None:
            db.add(record)
        db.flush()
        return record

    def scan_source(self, source_id: str, db: Session) -> dict[str, Any]:
        folder_path = self.folder_for(source_id)
        if not folder_path:
            return {"source_id": source_id, "status": "unsupported", "files_discovered": 0}
        return {
            "source_id": source_id,
            "status": "scanner-not-wired",
            "folder_path": folder_path,
            "files_discovered": 0,
        }

    def list_imports(self, db: Session, source_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        query = select(RawDataImport).order_by(RawDataImport.discovered_at.desc()).limit(limit)
        if source_id:
            query = (
                select(RawDataImport)
                .where(RawDataImport.source_id == source_id)
                .order_by(RawDataImport.discovered_at.desc())
                .limit(limit)
            )
        return [self.serialize(record) for record in db.scalars(query).all()]

    @staticmethod
    def serialize(record: RawDataImport) -> dict[str, Any]:
        return {
            "id": record.id,
            "sourceId": record.source_id,
            "externalFileId": record.external_file_id,
            "fileName": record.file_name,
            "mimeType": record.mime_type,
            "folderPath": record.folder_path,
            "webUrl": record.web_url,
            "sizeBytes": record.size_bytes,
            "checksum": record.checksum,
            "modifiedAt": record.modified_at.isoformat() if record.modified_at else None,
            "discoveredAt": record.discovered_at.isoformat(),
            "downloadedAt": record.downloaded_at.isoformat() if record.downloaded_at else None,
            "parsedAt": record.parsed_at.isoformat() if record.parsed_at else None,
            "status": record.status,
            "parserVersion": record.parser_version,
            "rawMetadata": record.raw_metadata,
            "error": record.error,
        }
