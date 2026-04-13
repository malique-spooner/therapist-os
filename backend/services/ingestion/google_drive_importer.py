from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
import hashlib
import io
import json
from typing import Any
import zipfile

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models import RawDataImport, RawImportRow


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

SOURCE_FOLDER_NAMES = {
    "garmin": ("Garmin",),
    "revolut": ("Revolut",),
    "natwest": ("natwest", "NatWest"),
    "instagram": ("meta-2026-Apr-07-01-16-52", "Instagram", "Meta"),
    "snapchat": ("Snapchat",),
    "youtube": ("Google",),
    "chrome": ("Google",),
}

TEXT_SUFFIXES = (".csv", ".json", ".txt")


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
    def __init__(self, config: dict[str, str] | None = None) -> None:
        self._config = config or {}

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

    async def scan_source(self, source_id: str, db: Session) -> dict[str, Any]:
        folder_path = self.folder_for(source_id)
        if source_id == "google_drive":
            return await self.scan_all(db)
        if not folder_path or source_id not in SOURCE_FOLDER_NAMES:
            return {"source_id": source_id, "status": "unsupported", "files_discovered": 0}
        token = await self._access_token()
        folder_id = await self._source_folder_id(source_id, token)
        if not folder_id:
            return {"source_id": source_id, "status": "folder-not-found", "folder_path": folder_path, "files_discovered": 0}

        files = await self._list_files_recursive(folder_id, token)
        raw_rows = 0
        for item in files:
            file_ref = self._file_ref(source_id, folder_path, item)
            import_record = self.record_discovered_file(file_ref, db)
            try:
                content = await self._download_file(item["id"], token)
                import_record.downloaded_at = datetime.utcnow()
                raw_rows += self._save_raw_content(import_record, source_id, item["name"], content, db)
                import_record.status = "parsed"
                import_record.parsed_at = datetime.utcnow()
                import_record.parser_version = "drive-raw-v1"
                import_record.error = None
            except Exception as exc:  # noqa: BLE001
                import_record.status = "failed"
                import_record.error = str(exc)
        db.commit()
        return {
            "source_id": source_id,
            "status": "scanned",
            "folder_path": folder_path,
            "files_discovered": len(files),
            "raw_rows": raw_rows,
            "rows_synced": raw_rows,
        }

    async def scan_all(self, db: Session) -> dict[str, Any]:
        totals = {"files_discovered": 0, "raw_rows": 0}
        sources = ("garmin", "revolut", "natwest", "instagram", "snapchat", "youtube", "chrome")
        for source_id in sources:
            result = await self.scan_source(source_id, db)
            totals["files_discovered"] += int(result.get("files_discovered", 0))
            totals["raw_rows"] += int(result.get("raw_rows", 0))
        return {
            "source_id": "google_drive",
            "status": "scanned",
            "folder_path": self._config.get("folder_path") or THERAPIST_OS_DRIVE_FOLDER,
            "files_discovered": totals["files_discovered"],
            "raw_rows": totals["raw_rows"],
            "rows_synced": totals["raw_rows"],
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

    async def _access_token(self) -> str:
        if not self._config.get("refresh_token"):
            raise RuntimeError("Google Drive is not authorized")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self._config["refresh_token"],
                    "client_id": self._config["client_id"],
                    "client_secret": self._config["client_secret"],
                },
            )
            response.raise_for_status()
            payload = response.json()
        token = payload.get("access_token")
        if not token:
            raise RuntimeError("Google Drive did not return an access token")
        return str(token)

    async def _source_folder_id(self, source_id: str, token: str) -> str | None:
        root_id = self._folder_id_from_value(self._config.get("folder_path") or THERAPIST_OS_DRIVE_FOLDER)
        if not root_id:
            return None
        for name in SOURCE_FOLDER_NAMES[source_id]:
            folder_id = await self._find_child_folder(root_id, name, token)
            if folder_id:
                return folder_id
        return None

    @staticmethod
    def _folder_id_from_value(value: str | None) -> str | None:
        if not value:
            return None
        if "/folders/" in value:
            return value.split("/folders/", 1)[1].split("?", 1)[0].split("/", 1)[0]
        return value if len(value) > 20 and "/" not in value else None

    async def _find_child_folder(self, parent_id: str, name: str, token: str) -> str | None:
        safe_name = name.replace("'", "\\'")
        query = (
            f"'{parent_id}' in parents and trashed = false and "
            "mimeType = 'application/vnd.google-apps.folder' and "
            f"name = '{safe_name}'"
        )
        payload = await self._drive_get("/files", token, {"q": query, "fields": "files(id,name)", "pageSize": "10"})
        files = payload.get("files", [])
        return str(files[0]["id"]) if files else None

    async def _list_files_recursive(self, folder_id: str, token: str) -> list[dict[str, Any]]:
        files: list[dict[str, Any]] = []
        page_token: str | None = None
        while True:
            query = f"'{folder_id}' in parents and trashed = false"
            params = {
                "q": query,
                "fields": "nextPageToken,files(id,name,mimeType,size,md5Checksum,modifiedTime,webViewLink)",
                "pageSize": "1000",
            }
            if page_token:
                params["pageToken"] = page_token
            payload = await self._drive_get("/files", token, params)
            for item in payload.get("files", []):
                if item.get("mimeType") == "application/vnd.google-apps.folder":
                    files.extend(await self._list_files_recursive(str(item["id"]), token))
                else:
                    files.append(item)
            page_token = payload.get("nextPageToken")
            if not page_token:
                return files

    async def _drive_get(self, path: str, token: str, params: dict[str, str]) -> dict[str, Any]:
        next_params = {"supportsAllDrives": "true", "includeItemsFromAllDrives": "true", **params}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(
                f"https://www.googleapis.com/drive/v3{path}",
                headers={"Authorization": f"Bearer {token}"},
                params=next_params,
            )
            response.raise_for_status()
            return response.json()

    async def _download_file(self, file_id: str, token: str) -> bytes:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {token}"},
                params={"alt": "media", "supportsAllDrives": "true"},
            )
            response.raise_for_status()
            return response.content

    def _file_ref(self, source_id: str, folder_path: str, item: dict[str, Any]) -> DriveFileRef:
        modified = None
        if item.get("modifiedTime"):
            modified = datetime.fromisoformat(str(item["modifiedTime"]).replace("Z", "+00:00")).replace(tzinfo=None)
        return DriveFileRef(
            source_id=source_id,
            external_file_id=str(item["id"]),
            file_name=str(item["name"]),
            mime_type=item.get("mimeType"),
            folder_path=folder_path,
            web_url=item.get("webViewLink"),
            size_bytes=int(item["size"]) if item.get("size") else None,
            checksum=item.get("md5Checksum"),
            modified_at=modified,
            raw_metadata=item,
        )

    def _save_raw_content(self, import_record: RawDataImport, source_id: str, file_name: str, content: bytes, db: Session) -> int:
        rows = self._extract_rows(file_name, content)
        for index, payload in enumerate(rows, start=1):
            self._upsert_raw_row(import_record, source_id, index, payload, db)
        return len(rows)

    def _extract_rows(self, file_name: str, content: bytes) -> list[dict[str, Any]]:
        lower = file_name.lower()
        if lower.endswith(".zip"):
            return self._extract_zip_rows(content)
        if lower.endswith(".csv"):
            return self._extract_csv_rows(file_name, content)
        if lower.endswith(".json"):
            return self._extract_json_rows(file_name, content)
        return [{"kind": "file", "file_name": file_name, "size_bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}]

    def _extract_zip_rows(self, content: bytes) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            for entry in archive.infolist():
                if entry.is_dir():
                    continue
                payload = {"kind": "archive_entry", "path": entry.filename, "size_bytes": entry.file_size}
                if entry.filename.lower().endswith(TEXT_SUFFIXES):
                    entry_bytes = archive.read(entry)
                    if entry.filename.lower().endswith(".csv"):
                        rows.extend(self._extract_csv_rows(entry.filename, entry_bytes))
                        continue
                    if entry.filename.lower().endswith(".json"):
                        rows.extend(self._extract_json_rows(entry.filename, entry_bytes))
                        continue
                    payload["text"] = self._decode_text(entry_bytes)[:20000]
                rows.append(payload)
        return rows

    def _extract_csv_rows(self, file_name: str, content: bytes) -> list[dict[str, Any]]:
        text = self._decode_text(content)
        return [{"kind": "csv_row", "path": file_name, "row": row} for row in csv.DictReader(io.StringIO(text))]

    def _extract_json_rows(self, file_name: str, content: bytes) -> list[dict[str, Any]]:
        data = json.loads(self._decode_text(content))
        if isinstance(data, list):
            return [{"kind": "json_item", "path": file_name, "row": item} for item in data]
        if isinstance(data, dict):
            rows = []
            for key, value in data.items():
                if isinstance(value, list):
                    rows.extend({"kind": "json_item", "path": file_name, "key": key, "row": item} for item in value)
            return rows or [{"kind": "json_document", "path": file_name, "row": data}]
        return [{"kind": "json_value", "path": file_name, "row": data}]

    @staticmethod
    def _decode_text(content: bytes) -> str:
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                return content.decode(encoding)
            except UnicodeDecodeError:
                continue
        return content.decode("utf-8", errors="replace")

    @staticmethod
    def _upsert_raw_row(import_record: RawDataImport, source_id: str, row_index: int, payload: dict[str, Any], db: Session) -> RawImportRow:
        row_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()
        record = db.scalar(
            select(RawImportRow).where(
                RawImportRow.import_id == import_record.id,
                RawImportRow.row_hash == row_hash,
            )
        )
        if record is None:
            record = RawImportRow(import_id=import_record.id, source_id=source_id, row_index=row_index, row_hash=row_hash, raw_payload=payload)
            db.add(record)
        record.raw_payload = payload
        record.status = "raw"
        record.error = None
        db.flush()
        return record
