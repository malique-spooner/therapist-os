from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from math import atan2, cos, radians, sin, sqrt
import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models.life_data import (
    LocationCompanionLogReal,
    LocationDailySummaryReal,
    LocationDataReal,
    LocationEventReal,
    LocationMovementReal,
    LocationPlaceHistoryReal,
    LocationPlaceMemoryReal,
    LocationTagOverrideReal,
    LocationVisitReal,
)
from .periods import date_window


@dataclass
class Visit:
    id: str
    place_key: str
    place_label: str
    category: str
    start_timestamp: str
    end_timestamp: str
    dwell_minutes: int
    latitude: float
    longitude: float
    highlight: str
    tone: str
    confidence_score: float = 0.65
    correction: dict | None = None


@dataclass
class Movement:
    id: str
    movement_type: str
    label: str
    start_timestamp: str
    end_timestamp: str
    duration_minutes: int
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    distance_metres: float
    average_speed_kmh: float
    confidence_score: float
    correction: dict | None = None


class LocationIntelligenceService:
    HOME_RADIUS_METRES = 180
    VISIT_BREAK_GAP_MINUTES = 90

    def get_intelligence(
        self,
        period: str | None,
        target_date: str | None,
        start_date: str | None,
        end_date: str | None,
        mode: str | None,
        db: Session,
    ) -> dict:
        start, end = self._resolve_window(period, start_date, end_date)
        start_dt = datetime(start.year, start.month, start.day)
        end_dt = datetime(end.year, end.month, end.day, 23, 59, 59)

        rows = db.scalars(
            select(LocationDataReal)
            .where(LocationDataReal.timestamp.between(start_dt, end_dt))
            .order_by(LocationDataReal.timestamp)
        ).all()
        summaries = db.scalars(
            select(LocationDailySummaryReal)
            .where(LocationDailySummaryReal.date.between(start, end))
            .order_by(LocationDailySummaryReal.date)
        ).all()
        event_rows = db.scalars(
            select(LocationEventReal)
            .where(LocationEventReal.timestamp.between(start_dt, end_dt))
            .order_by(LocationEventReal.timestamp)
        ).all()
        selected_date = target_date or self._default_selected_date(summaries, rows, end)
        companion = db.scalar(select(LocationCompanionLogReal).where(LocationCompanionLogReal.date == datetime.fromisoformat(selected_date).date()))

        points = [self._serialize_point(row) for row in rows]
        summaries_payload = [self._serialize_summary(row) for row in summaries]
        selected_day = next((item for item in summaries_payload if item["date"] == selected_date), None)
        selected_day_points = [point for point in points if point["timestamp"].startswith(selected_date)]

        persisted_places = {
            row.place_key: row
            for row in db.scalars(select(LocationPlaceMemoryReal)).all()
        }
        overrides = db.scalars(select(LocationTagOverrideReal)).all()
        visits, movements = self._derive_timeline(selected_day_points, persisted_places, companion, overrides)
        self._synchronise_timeline_records(visits, movements, db)
        places = self._synchronise_places(visits, event_rows, persisted_places, LocationPlaceMemoryReal, db)
        place_history_counts = self._history_counts(db)
        recap_scenes = self._build_recap_scenes(selected_day, places, visits, event_rows)

        timeline = self._serialize_timeline(visits, movements)
        total_minutes = self._clamp_day_minutes(sum(row["durationMinutes"] for row in timeline))
        derived_outside_minutes = sum(visit.dwell_minutes for visit in visits if visit.category != "home")
        derived_movement_minutes = sum(movement.duration_minutes for movement in movements)
        outside_minutes = selected_day["timeOutdoorsMinutes"] if selected_day else derived_outside_minutes
        outside_minutes = self._clamp_day_minutes(outside_minutes)
        if derived_outside_minutes or derived_movement_minutes:
            outside_minutes = min(outside_minutes, self._clamp_day_minutes(derived_outside_minutes + derived_movement_minutes))
        if selected_day:
            selected_day["timeOutdoorsMinutes"] = outside_minutes
        waypoint_events = [row for row in event_rows if (row.event_type or "").lower() in {"transition", "waypoint", "region"}]
        hero_title = (
            "Movement and people are shaping the story"
            if selected_day and selected_day["socialVenueVisits"] > 0
            else "Place is acting like a nervous-system signal"
        )
        hero_body = (
            f"You logged {len(visits)} visits on the selected day, with {self._format_minutes(total_minutes)} of tracked dwell, {outside_minutes} minutes outside home, and {len(waypoint_events)} waypoint/geofence signals."
            if visits
            else "Once your phone starts sending traces, this page turns them into visits, places, and a weekly story."
        )

        return {
            "mode": "real-only",
            "hasRealMapData": bool(points),
            "heroTitle": hero_title,
            "heroBody": hero_body,
            "summaries": summaries_payload,
            "selectedDay": selected_day,
            "points": points,
            "selectedDayPoints": selected_day_points,
            "timeline": timeline,
            "visits": [self._serialize_visit(visit) for visit in visits],
            "places": [self._serialize_place_memory(place, history_count=place_history_counts.get(place.place_key, 0)) for place in places],
            "recapScenes": recap_scenes,
            "rangeStats": [
                {"label": "Tracked time", "value": self._format_minutes(total_minutes), "detail": f"{len(visits)} visits and {len(movements)} movement segments"},
                {"label": "Smart places", "value": str(len(places)), "detail": "Backend clustering, confidence states, and memory"},
                {"label": "Movement", "value": self._format_minutes(derived_movement_minutes), "detail": "Walking, cycling, transit, and uncertain motion separated from places"},
                {"label": "OwnTracks events", "value": str(len(waypoint_events)), "detail": "Waypoint and geofence transitions carried into inference"},
            ],
        }

    def upsert_place(self, place_key: str, payload: dict, mode: str | None, db: Session) -> dict:
        row = db.scalar(select(LocationPlaceMemoryReal).where(LocationPlaceMemoryReal.place_key == place_key))
        if not row:
            row = LocationPlaceMemoryReal(place_key=place_key, status="active")
            db.add(row)

        before = self._serialize_place_memory(row)
        row.label = payload.get("label")
        row.category = payload.get("category")
        row.tone = payload.get("tone")
        row.note = payload.get("note")
        db.flush()
        db.add(
            LocationPlaceHistoryReal(
                place_key=place_key,
                action="rename" if before.get("label") != row.label and row.label else "update",
                detail_json={"before": before, "after": self._serialize_place_memory(row)},
            )
        )
        db.commit()
        db.refresh(row)
        return self._serialize_place_memory(row)

    def merge_place(self, place_key: str, target_place_key: str, mode: str | None, db: Session) -> dict:
        source = db.scalar(select(LocationPlaceMemoryReal).where(LocationPlaceMemoryReal.place_key == place_key))
        target = db.scalar(select(LocationPlaceMemoryReal).where(LocationPlaceMemoryReal.place_key == target_place_key))
        if source is None or target is None:
            raise KeyError("Missing source or target place")
        source.status = "merged"
        source.merged_into_key = target_place_key
        db.add(LocationPlaceHistoryReal(place_key=place_key, action="merge", detail_json={"targetPlaceKey": target_place_key}))
        db.commit()
        db.refresh(source)
        return self._serialize_place_memory(source)

    def split_place(self, place_key: str, new_place_key: str, label: str | None, mode: str | None, db: Session) -> dict:
        source = db.scalar(select(LocationPlaceMemoryReal).where(LocationPlaceMemoryReal.place_key == place_key))
        if source is None:
            raise KeyError("Missing source place")
        row = db.scalar(select(LocationPlaceMemoryReal).where(LocationPlaceMemoryReal.place_key == new_place_key))
        if not row:
            row = LocationPlaceMemoryReal(
                place_key=new_place_key,
                label=label,
                category=source.category,
                tone=source.tone,
                note=source.note,
                confidence_score=max(0.35, (source.confidence_score or 0.6) - 0.12),
                status="active",
                split_from_key=place_key,
                latitude=source.latitude,
                longitude=source.longitude,
            )
            db.add(row)
        db.add(LocationPlaceHistoryReal(place_key=place_key, action="split", detail_json={"newPlaceKey": new_place_key, "label": label}))
        db.commit()
        db.refresh(row)
        return self._serialize_place_memory(row)

    def get_place_history(self, place_key: str, mode: str | None, db: Session) -> list[dict]:
        rows = db.scalars(
            select(LocationPlaceHistoryReal)
            .where(LocationPlaceHistoryReal.place_key == place_key)
            .order_by(LocationPlaceHistoryReal.created_at.desc())
        ).all()
        return [
            {
                "id": row.id,
                "placeKey": row.place_key,
                "action": row.action,
                "detail": row.detail_json,
                "createdAt": row.created_at.isoformat(),
            }
            for row in rows
        ]

    def tag_timeline_row(self, row_id: str, payload: dict, mode: str | None, db: Session) -> dict:
        visit = db.scalar(select(LocationVisitReal).where(LocationVisitReal.row_id == row_id))
        if visit:
            override = self._upsert_override(
                db,
                target_kind="visit",
                target_key=visit.place_key,
                row_id=row_id,
                label=payload.get("label") or visit.place_label,
                category=payload.get("category") or visit.category,
                movement_type=None,
                tone=payload.get("tone"),
                note=payload.get("note"),
                latitude=visit.latitude,
                longitude=visit.longitude,
                radius_metres=self.HOME_RADIUS_METRES,
                signature_json={"placeKey": visit.place_key},
            )
            place = db.scalar(select(LocationPlaceMemoryReal).where(LocationPlaceMemoryReal.place_key == visit.place_key))
            if not place:
                place = LocationPlaceMemoryReal(place_key=visit.place_key, status="active")
                db.add(place)
            if payload.get("label"):
                place.label = payload["label"]
                visit.place_label = payload["label"]
            if payload.get("category"):
                place.category = payload["category"]
                visit.category = payload["category"]
            if payload.get("tone"):
                place.tone = payload["tone"]
            if payload.get("note"):
                place.note = payload["note"]
            db.add(LocationPlaceHistoryReal(place_key=visit.place_key, action="timeline-tag", detail_json={"rowId": row_id, "payload": payload}))
            db.commit()
            db.refresh(visit)
            return {
                "detail": "Timeline visit tagged",
                "row": self._serialize_timeline_visit_record(visit, correction=self._serialize_override(override)),
            }

        movement = db.scalar(select(LocationMovementReal).where(LocationMovementReal.row_id == row_id))
        if movement:
            if payload.get("movementType"):
                movement.movement_type = payload["movementType"]
            if payload.get("label"):
                movement.label = payload["label"]
            override = self._upsert_override(
                db,
                target_kind="movement",
                target_key=row_id,
                row_id=row_id,
                label=payload.get("label") or movement.label,
                category=None,
                movement_type=payload.get("movementType") or movement.movement_type,
                tone=payload.get("tone"),
                note=payload.get("note"),
                latitude=movement.start_latitude,
                longitude=movement.start_longitude,
                radius_metres=260,
                signature_json={
                    "start": [movement.start_latitude, movement.start_longitude],
                    "end": [movement.end_latitude, movement.end_longitude],
                    "averageSpeedKmh": movement.average_speed_kmh,
                },
            )
            db.commit()
            db.refresh(movement)
            return {
                "detail": "Timeline movement tagged",
                "row": self._serialize_timeline_movement_record(movement, correction=self._serialize_override(override)),
            }

        raise KeyError("Timeline row not found")

    def _derive_timeline(self, points: list[dict], persisted_places: dict[str, object], companion, overrides: list[object]) -> tuple[list[Visit], list[Movement]]:
        if not points:
            return [], []

        annotated: list[dict] = []
        previous: dict | None = None
        for point in points:
            item = dict(point)
            item["placeKey"] = self._cluster_key(item["latitude"], item["longitude"], persisted_places)
            item["timelineKind"] = "movement" if self._point_is_moving(item, previous) else "visit"
            item["movementHint"] = self._movement_hint(item) if item["timelineKind"] == "movement" else None
            annotated.append(item)
            previous = item

        grouped: list[dict] = []
        for point in annotated:
            if not grouped:
                grouped.append({"kind": point["timelineKind"], "points": [point]})
                continue
            current = grouped[-1]
            last_point = current["points"][-1]
            gap_minutes = self._minutes_between(last_point["timestamp"], point["timestamp"])
            same_place = point["placeKey"] == last_point["placeKey"]
            should_break = gap_minutes > self.VISIT_BREAK_GAP_MINUTES or point["timelineKind"] != current["kind"]
            if current["kind"] == "movement" and point["timelineKind"] == "movement" and point.get("movementHint") != last_point.get("movementHint"):
                should_break = True
            if current["kind"] == "visit" and point["timelineKind"] == "visit" and not same_place:
                should_break = True
            if should_break:
                grouped.append({"kind": point["timelineKind"], "points": [point]})
            else:
                current["points"].append(point)

        visits: list[Visit] = []
        movements: list[Movement] = []
        for index, segment in enumerate(grouped):
            group = segment["points"]
            if segment["kind"] == "movement":
                movement = self._movement_from_group(group, grouped[index + 1]["points"] if index + 1 < len(grouped) else None, overrides)
                if movement.duration_minutes > 0 or movement.distance_metres > 40:
                    movements.append(movement)
                continue

            visit = self._visit_from_group(group, grouped[index + 1]["points"] if index + 1 < len(grouped) else None, len(visits), persisted_places, companion, overrides)
            if self._is_micro_transition_visit(visit, group):
                movements.append(self._movement_from_micro_visit(visit, group))
                continue
            visits.append(visit)
        return visits, movements

    def _visit_from_group(
        self,
        group: list[dict],
        next_group: list[dict] | None,
        index: int,
        persisted_places: dict[str, object],
        companion,
        overrides: list[object],
    ) -> Visit:
        first = group[0]
        last = group[-1]
        dwell_minutes = self._estimate_visit_dwell_minutes(group, next_group)
        latitude = sum(point["latitude"] for point in group) / len(group)
        longitude = sum(point["longitude"] for point in group) / len(group)
        place_key = first["placeKey"]
        place = persisted_places.get(place_key)
        override = self._matching_place_override(latitude, longitude, place_key, overrides)
        region_name = self._region_name(group)

        if override and getattr(override, "category", None):
            category = override.category
            confidence = 0.96
        elif getattr(place, "category", None):
            category = place.category
            confidence = 0.88
        elif region_name:
            category = self._category_from_region(region_name)
            confidence = 0.78
        else:
            category = self._derive_category(place_key, dwell_minutes, last["timestamp"])
            confidence = 0.52 if category in {"errands", "misc"} else 0.66

        place_label = (
            getattr(override, "label", None)
            or getattr(place, "label", None)
            or region_name
            or self._place_label(place_key, category, index)
        )
        tone = getattr(override, "tone", None) or getattr(place, "tone", None) or self._default_tone(category, companion is not None and bool(getattr(companion, "person_ids", [])))
        row_id = self._timeline_row_id("visit", first["timestamp"], last["timestamp"], place_key)
        return Visit(
            id=row_id,
            place_key=place_key,
            place_label=place_label,
            category=category,
            start_timestamp=first["timestamp"],
            end_timestamp=last["timestamp"],
            dwell_minutes=dwell_minutes,
            latitude=latitude,
            longitude=longitude,
            highlight=self._visit_highlight(category, dwell_minutes, companion),
            tone=tone,
            confidence_score=confidence,
            correction=self._serialize_override(override) if override else None,
        )

    def _movement_from_group(self, group: list[dict], next_group: list[dict] | None, overrides: list[object]) -> Movement:
        first = group[0]
        last = group[-1]
        observed_minutes = self._minutes_between(first["timestamp"], last["timestamp"])
        if next_group and observed_minutes == 0:
            observed_minutes = min(self.VISIT_BREAK_GAP_MINUTES, self._minutes_between(first["timestamp"], next_group[0]["timestamp"]))
        duration_minutes = self._clamp_visit_minutes(max(1, observed_minutes))
        distance_metres = self._path_distance_metres(group)
        average_speed_kmh = (distance_metres / 1000) / (duration_minutes / 60) if duration_minutes else 0
        movement_type, confidence = self._classify_movement(group, average_speed_kmh)
        row_id = self._timeline_row_id("movement", first["timestamp"], last["timestamp"], f"{round(first['latitude'], 4)}:{round(last['latitude'], 4)}")
        override = self._matching_movement_override(row_id, first, last, overrides)
        if override and getattr(override, "movement_type", None):
            movement_type = override.movement_type
            confidence = 0.96
        return Movement(
            id=row_id,
            movement_type=movement_type,
            label=getattr(override, "label", None) or self._movement_label(movement_type),
            start_timestamp=first["timestamp"],
            end_timestamp=last["timestamp"],
            duration_minutes=duration_minutes,
            start_latitude=first["latitude"],
            start_longitude=first["longitude"],
            end_latitude=last["latitude"],
            end_longitude=last["longitude"],
            distance_metres=distance_metres,
            average_speed_kmh=average_speed_kmh,
            confidence_score=confidence,
            correction=self._serialize_override(override) if override else None,
        )

    @staticmethod
    def _is_micro_transition_visit(visit: Visit, group: list[dict]) -> bool:
        if visit.place_key == "home" or visit.correction:
            return False
        return visit.category in {"errands", "misc"} and visit.dwell_minutes <= 5 and len(group) <= 2 and visit.confidence_score < 0.6

    def _movement_from_micro_visit(self, visit: Visit, group: list[dict]) -> Movement:
        first = group[0]
        last = group[-1]
        return Movement(
            id=self._timeline_row_id("movement", visit.start_timestamp, visit.end_timestamp, f"micro:{visit.place_key}"),
            movement_type="unknown_movement",
            label="Unknown movement",
            start_timestamp=visit.start_timestamp,
            end_timestamp=visit.end_timestamp,
            duration_minutes=max(1, visit.dwell_minutes),
            start_latitude=first["latitude"],
            start_longitude=first["longitude"],
            end_latitude=last["latitude"],
            end_longitude=last["longitude"],
            distance_metres=self._path_distance_metres(group),
            average_speed_kmh=0,
            confidence_score=0.42,
        )

    def _derive_visits(self, points: list[dict], persisted_places: dict[str, object], companion) -> list[Visit]:
        visits, _movements = self._derive_timeline(points, persisted_places, companion, [])
        return visits

    def _derive_visits_legacy(self, points: list[dict], persisted_places: dict[str, object], companion) -> list[Visit]:
        grouped: list[list[dict]] = []
        for point in points:
            current_key = self._cluster_key(point["latitude"], point["longitude"], persisted_places)
            point["placeKey"] = current_key
            if not grouped:
                grouped.append([point])
                continue
            last_group = grouped[-1]
            last_point = last_group[-1]
            gap_minutes = max(0, int((datetime.fromisoformat(point["timestamp"]) - datetime.fromisoformat(last_point["timestamp"])).total_seconds() // 60))
            if last_point["placeKey"] != current_key or gap_minutes > self.VISIT_BREAK_GAP_MINUTES:
                grouped.append([point])
            else:
                last_group.append(point)

        visits: list[Visit] = []
        for index, group in enumerate(grouped):
            first = group[0]
            last = group[-1]
            dwell_minutes = self._estimate_visit_dwell_minutes(group, grouped[index + 1] if index + 1 < len(grouped) else None)
            latitude = sum(point["latitude"] for point in group) / len(group)
            longitude = sum(point["longitude"] for point in group) / len(group)
            place = persisted_places.get(first["placeKey"])
            category = getattr(place, "category", None) or self._derive_category(first["placeKey"], dwell_minutes, last["timestamp"])
            place_label = getattr(place, "label", None) or self._place_label(first["placeKey"], category, index)
            tone = getattr(place, "tone", None) or self._default_tone(category, companion is not None and bool(getattr(companion, "person_ids", [])))
            highlight = self._visit_highlight(category, dwell_minutes, companion)
            visits.append(
                Visit(
                    id=f"{first['placeKey']}-{first['timestamp']}",
                    place_key=first["placeKey"],
                    place_label=place_label,
                    category=category,
                    start_timestamp=first["timestamp"],
                    end_timestamp=last["timestamp"],
                    dwell_minutes=dwell_minutes,
                    latitude=latitude,
                    longitude=longitude,
                    highlight=highlight,
                    tone=tone,
                )
            )
        return visits

    def _synchronise_places(self, visits: list[Visit], event_rows: list[object], persisted_places: dict[str, object], place_model, db: Session) -> list[object]:
        grouped: dict[str, list[Visit]] = defaultdict(list)
        for visit in visits:
            grouped[visit.place_key].append(visit)

        for waypoint_event in event_rows:
            if waypoint_event.waypoint_name:
                key = self._stable_key(f"waypoint:{waypoint_event.waypoint_name}")
                fake_visit = Visit(
                    id=f"event-{waypoint_event.id}",
                    place_key=key,
                    place_label=waypoint_event.waypoint_name,
                    category="social" if "foot" in (waypoint_event.waypoint_name or "").lower() else "misc",
                    start_timestamp=waypoint_event.timestamp.isoformat(),
                    end_timestamp=waypoint_event.timestamp.isoformat(),
                    dwell_minutes=15,
                    latitude=waypoint_event.latitude or settings.USER_LATITUDE,
                    longitude=waypoint_event.longitude or settings.USER_LONGITUDE,
                    highlight=waypoint_event.trigger or "OwnTracks event",
                    tone="positive",
                )
                grouped[key].append(fake_visit)

        places: list[object] = []
        for key, key_visits in grouped.items():
            if key in persisted_places:
                row = persisted_places[key]
            else:
                row = place_model(place_key=key, status="active")
                db.add(row)
            row.label = row.label or key_visits[0].place_label
            row.category = row.category or key_visits[0].category
            row.tone = row.tone or key_visits[0].tone
            row.latitude = sum(visit.latitude for visit in key_visits) / len(key_visits)
            row.longitude = sum(visit.longitude for visit in key_visits) / len(key_visits)
            visit_count = len(key_visits)
            total_minutes = sum(visit.dwell_minutes for visit in key_visits)
            first_seen_at = min(datetime.fromisoformat(visit.start_timestamp) for visit in key_visits)
            last_seen_at = max(datetime.fromisoformat(visit.end_timestamp) for visit in key_visits)
            row.visit_count = max(row.visit_count or 0, visit_count)
            row.total_minutes = max(row.total_minutes or 0, total_minutes)
            row.first_seen_at = min(row.first_seen_at, first_seen_at) if row.first_seen_at else first_seen_at
            row.last_seen_at = max(row.last_seen_at, last_seen_at) if row.last_seen_at else last_seen_at
            row.confidence_score = self._confidence_for_place(row.visit_count, row.total_minutes)
            if row.status is None:
                row.status = "active"
            places.append(row)

        db.commit()
        for row in places:
            db.refresh(row)
        active_places = [place for place in places if getattr(place, "status", "active") == "active"]
        return sorted(active_places, key=lambda row: (row.place_key != "home", -(row.total_minutes or 0)))

    def _synchronise_timeline_records(self, visits: list[Visit], movements: list[Movement], db: Session) -> None:
        for visit in visits:
            row = db.scalar(select(LocationVisitReal).where(LocationVisitReal.row_id == visit.id))
            if not row:
                row = LocationVisitReal(row_id=visit.id)
                db.add(row)
            row.place_key = visit.place_key
            row.place_label = visit.place_label
            row.category = visit.category
            row.start_timestamp = datetime.fromisoformat(visit.start_timestamp)
            row.end_timestamp = datetime.fromisoformat(visit.end_timestamp)
            row.duration_minutes = visit.dwell_minutes
            row.latitude = visit.latitude
            row.longitude = visit.longitude
            row.confidence_score = visit.confidence_score
            row.status = "active"
            row.source = "inferred"

        for movement in movements:
            row = db.scalar(select(LocationMovementReal).where(LocationMovementReal.row_id == movement.id))
            if not row:
                row = LocationMovementReal(row_id=movement.id)
                db.add(row)
            row.movement_type = movement.movement_type
            row.label = movement.label
            row.start_timestamp = datetime.fromisoformat(movement.start_timestamp)
            row.end_timestamp = datetime.fromisoformat(movement.end_timestamp)
            row.duration_minutes = movement.duration_minutes
            row.start_latitude = movement.start_latitude
            row.start_longitude = movement.start_longitude
            row.end_latitude = movement.end_latitude
            row.end_longitude = movement.end_longitude
            row.distance_metres = movement.distance_metres
            row.average_speed_kmh = movement.average_speed_kmh
            row.confidence_score = movement.confidence_score
            row.status = "active"
            row.source = "inferred"
        db.commit()

    @staticmethod
    def _serialize_timeline(visits: list[Visit], movements: list[Movement]) -> list[dict]:
        rows = [
            LocationIntelligenceService._serialize_timeline_visit(visit)
            for visit in visits
        ] + [
            LocationIntelligenceService._serialize_timeline_movement(movement)
            for movement in movements
        ]
        return sorted(rows, key=lambda row: row["startTimestamp"])

    @staticmethod
    def _serialize_timeline_visit(visit: Visit) -> dict:
        return {
            "id": visit.id,
            "rowId": visit.id,
            "kind": "visit",
            "label": visit.place_label,
            "placeKey": visit.place_key,
            "placeLabel": visit.place_label,
            "category": visit.category,
            "startTimestamp": visit.start_timestamp,
            "endTimestamp": visit.end_timestamp,
            "durationMinutes": visit.dwell_minutes,
            "latitude": visit.latitude,
            "longitude": visit.longitude,
            "confidenceScore": visit.confidence_score,
            "isLowConfidence": visit.confidence_score < 0.6,
            "highlight": visit.highlight,
            "tone": visit.tone,
            "correction": visit.correction,
        }

    @staticmethod
    def _serialize_timeline_movement(movement: Movement) -> dict:
        return {
            "id": movement.id,
            "rowId": movement.id,
            "kind": "movement",
            "label": movement.label,
            "movementType": movement.movement_type,
            "startTimestamp": movement.start_timestamp,
            "endTimestamp": movement.end_timestamp,
            "durationMinutes": movement.duration_minutes,
            "startLatitude": movement.start_latitude,
            "startLongitude": movement.start_longitude,
            "endLatitude": movement.end_latitude,
            "endLongitude": movement.end_longitude,
            "distanceMetres": movement.distance_metres,
            "averageSpeedKmh": movement.average_speed_kmh,
            "confidenceScore": movement.confidence_score,
            "isLowConfidence": movement.confidence_score < 0.6,
            "correction": movement.correction,
        }

    @staticmethod
    def _serialize_timeline_visit_record(row, correction: dict | None = None) -> dict:
        return {
            "id": row.row_id,
            "rowId": row.row_id,
            "kind": "visit",
            "label": row.place_label or row.place_key,
            "placeKey": row.place_key,
            "placeLabel": row.place_label,
            "category": row.category,
            "startTimestamp": row.start_timestamp.isoformat(),
            "endTimestamp": row.end_timestamp.isoformat(),
            "durationMinutes": row.duration_minutes,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "confidenceScore": row.confidence_score,
            "isLowConfidence": (row.confidence_score or 0) < 0.6,
            "correction": correction,
        }

    @staticmethod
    def _serialize_timeline_movement_record(row, correction: dict | None = None) -> dict:
        return {
            "id": row.row_id,
            "rowId": row.row_id,
            "kind": "movement",
            "label": row.label or LocationIntelligenceService._movement_label(row.movement_type),
            "movementType": row.movement_type,
            "startTimestamp": row.start_timestamp.isoformat(),
            "endTimestamp": row.end_timestamp.isoformat(),
            "durationMinutes": row.duration_minutes,
            "startLatitude": row.start_latitude,
            "startLongitude": row.start_longitude,
            "endLatitude": row.end_latitude,
            "endLongitude": row.end_longitude,
            "distanceMetres": row.distance_metres,
            "averageSpeedKmh": row.average_speed_kmh,
            "confidenceScore": row.confidence_score,
            "isLowConfidence": (row.confidence_score or 0) < 0.6,
            "correction": correction,
        }

    def _build_recap_scenes(self, selected_day: dict | None, places: list[object], visits: list[Visit], event_rows: list[object]) -> list[dict]:
        top_visits = [visit for visit in visits if visit.category != "home"][:3]
        if not places:
            return []
        home = next((place for place in places if place.place_key == "home"), places[0])
        scenes = [
            {
                "id": "home-overview",
                "title": "Week in place",
                "description": f"You spent {(selected_day or {}).get('homeHours', 0):.1f} hours at home on the selected day.",
                "latitude": home.latitude or settings.USER_LATITUDE,
                "longitude": home.longitude or settings.USER_LONGITUDE,
                "zoom": 16,
                "heading": 35,
                "tilt": 45,
                "accent": "Home rhythm",
                "durationMs": 5200,
            }
        ]
        for index, visit in enumerate(top_visits):
            scenes.append(
                {
                    "id": f"visit-{index}",
                    "title": visit.place_label,
                    "description": f"{self._format_minutes(visit.dwell_minutes)} here. {visit.highlight}.",
                    "latitude": visit.latitude,
                    "longitude": visit.longitude,
                    "zoom": 17,
                    "heading": 65 + index * 45,
                    "tilt": 48,
                    "accent": "Flyover",
                    "durationMs": 4800,
                }
            )
        transition_event = next((row for row in event_rows if (row.trigger or "").lower() in {"enter", "leave"} and row.waypoint_name), None)
        if transition_event:
            scenes.append(
                {
                    "id": "geofence-signal",
                    "title": f"{(transition_event.trigger or 'Transition').title()} {transition_event.waypoint_name}",
                    "description": "OwnTracks picked up a waypoint transition here, so this place can become a teachable recurring scene rather than a loose dot on the map.",
                    "latitude": transition_event.latitude or settings.USER_LATITUDE,
                    "longitude": transition_event.longitude or settings.USER_LONGITUDE,
                    "zoom": 18,
                    "heading": 155,
                    "tilt": 50,
                    "accent": "Geofence memory",
                    "durationMs": 4600,
                }
            )
        strong_place = next((place for place in places if getattr(place, "tone", None) == "positive" and place.place_key != "home"), None)
        if strong_place:
            scenes.append(
                {
                    "id": "pattern",
                    "title": "Pattern read",
                    "description": f"{strong_place.label or strong_place.place_key} keeps behaving like a regulating place.",
                    "latitude": strong_place.latitude or settings.USER_LATITUDE,
                    "longitude": strong_place.longitude or settings.USER_LONGITUDE,
                    "zoom": 16,
                    "heading": 120,
                    "tilt": 46,
                    "accent": "Keep this in rotation",
                    "durationMs": 5200,
                }
            )
        return scenes

    @staticmethod
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

    @staticmethod
    def _serialize_visit(visit: Visit) -> dict:
        return {
            "id": visit.id,
            "placeKey": visit.place_key,
            "placeLabel": visit.place_label,
            "category": visit.category,
            "startTimestamp": visit.start_timestamp,
            "endTimestamp": visit.end_timestamp,
            "dwellMinutes": visit.dwell_minutes,
            "latitude": visit.latitude,
            "longitude": visit.longitude,
            "highlight": visit.highlight,
            "tone": visit.tone,
            "confidenceScore": visit.confidence_score,
            "correction": visit.correction,
        }

    @staticmethod
    def _serialize_summary(row) -> dict:
        return {
            "date": row.date.isoformat(),
            "homeHours": row.home_hours or 0,
            "gymVisits": row.gym_visits,
            "socialVenueVisits": row.social_venue_visits,
            "newPlacesVisited": row.new_places_visited,
            "commuteDetected": row.commute_detected,
            "timeOutdoorsMinutes": LocationIntelligenceService._clamp_day_minutes(row.time_outdoors_minutes or 0),
        }

    @staticmethod
    def _serialize_place_memory(row, history_count: int = 0) -> dict:
        average_dwell_minutes = int(round((row.total_minutes or 0) / max(row.visit_count or 1, 1))) if row.total_minutes else 0
        return {
            "placeKey": row.place_key,
            "label": row.label,
            "suggestedLabel": row.label or LocationIntelligenceService._suggested_label(row.place_key, row.category),
            "category": row.category,
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
            "averageDwellMinutes": average_dwell_minutes,
            "firstSeenAt": row.first_seen_at.isoformat() if row.first_seen_at else None,
            "lastSeenAt": row.last_seen_at.isoformat() if row.last_seen_at else None,
            "lastVisited": row.last_seen_at.isoformat() if row.last_seen_at else None,
            "historyCount": history_count,
            "insight": LocationIntelligenceService._place_insight(row, average_dwell_minutes),
        }

    def _cluster_key(self, latitude: float, longitude: float, persisted_places: dict[str, object]) -> str:
        for key, row in persisted_places.items():
            if getattr(row, "status", "active") != "active":
                continue
            if row.latitude is None or row.longitude is None:
                continue
            if self._distance_metres(latitude, longitude, row.latitude, row.longitude) <= self.HOME_RADIUS_METRES:
                return key
        if self._distance_metres(latitude, longitude, settings.USER_LATITUDE, settings.USER_LONGITUDE) <= self.HOME_RADIUS_METRES:
            return "home"
        return self._stable_key(f"{round(latitude, 3)}:{round(longitude, 3)}")

    def _point_is_moving(self, point: dict, previous: dict | None) -> bool:
        activities = self._activities(point)
        if activities & {"walking", "running", "cycling", "automotive", "in_vehicle", "vehicle", "train", "bus", "bicycle"}:
            return True
        if activities & {"stationary"}:
            return False
        speed = point.get("velocity")
        if isinstance(speed, int | float) and speed >= 1.2:
            return True
        if previous:
            gap_minutes = self._minutes_between(previous["timestamp"], point["timestamp"])
            if 0 < gap_minutes <= 25:
                distance = self._distance_metres(previous["latitude"], previous["longitude"], point["latitude"], point["longitude"])
                inferred_speed_kmh = (distance / 1000) / (gap_minutes / 60)
                accuracy_floor = max(30, (point.get("accuracy") or 0) + (previous.get("accuracy") or 0) + 12)
                return distance > accuracy_floor and inferred_speed_kmh > 3.5
        return False

    def _classify_movement(self, group: list[dict], average_speed_kmh: float) -> tuple[str, float]:
        activities = set().union(*(self._activities(point) for point in group))
        if activities & {"cycling", "bicycle"}:
            return "cycling", 0.88
        if activities & {"walking", "running", "on_foot"}:
            return "walking", 0.86
        if activities & {"automotive", "in_vehicle", "vehicle", "train", "bus"}:
            return "transit", 0.88
        if average_speed_kmh >= 18:
            return "transit", 0.7
        if 7 <= average_speed_kmh < 18:
            return "cycling", 0.64
        if 1.2 <= average_speed_kmh < 7:
            return "walking", 0.62
        return "unknown_movement", 0.42

    def _movement_hint(self, point: dict) -> str:
        movement_type, _confidence = self._classify_movement([point], ((point.get("velocity") or 0) * 3.6) if point.get("velocity") else 0)
        return movement_type

    @staticmethod
    def _activities(point: dict) -> set[str]:
        raw = point.get("motionActivities") or point.get("motion_activities") or []
        if isinstance(raw, str):
            raw = [raw]
        return {str(item).lower().replace(" ", "_") for item in raw}

    def _region_name(self, group: list[dict]) -> str | None:
        for point in group:
            regions = point.get("inRegions") or point.get("in_regions") or []
            if regions:
                return str(regions[0])
        return None

    @staticmethod
    def _category_from_region(region_name: str) -> str:
        value = region_name.lower()
        if "home" in value:
            return "home"
        if "work" in value or "office" in value or "uni" in value or "university" in value:
            return "work"
        if "gym" in value or "fitness" in value:
            return "gym"
        if "park" in value or "green" in value:
            return "green_space"
        if "cafe" in value or "coffee" in value:
            return "cafe"
        return "misc"

    @staticmethod
    def _movement_label(movement_type: str) -> str:
        return {
            "walking": "Walk",
            "cycling": "Cycle",
            "transit": "Transit",
            "unknown_movement": "Unknown movement",
        }.get(movement_type, "Movement")

    @staticmethod
    def _timeline_row_id(kind: str, start_timestamp: str, end_timestamp: str, key: str) -> str:
        return f"{kind}-{LocationIntelligenceService._stable_key(f'{kind}:{start_timestamp}:{end_timestamp}:{key}')}"

    def _path_distance_metres(self, group: list[dict]) -> float:
        if len(group) < 2:
            return 0
        total = 0.0
        for previous, current in zip(group, group[1:], strict=False):
            total += self._distance_metres(previous["latitude"], previous["longitude"], current["latitude"], current["longitude"])
        return round(total, 1)

    @staticmethod
    def _minutes_between(start_timestamp: str, end_timestamp: str) -> int:
        return max(0, int((datetime.fromisoformat(end_timestamp) - datetime.fromisoformat(start_timestamp)).total_seconds() // 60))

    def _matching_place_override(self, latitude: float, longitude: float, place_key: str, overrides: list[object]):
        for override in overrides:
            if getattr(override, "target_kind", None) not in {"visit", "place"}:
                continue
            if getattr(override, "target_key", None) == place_key:
                return override
            if override.latitude is None or override.longitude is None:
                continue
            radius = override.radius_metres or self.HOME_RADIUS_METRES
            if self._distance_metres(latitude, longitude, override.latitude, override.longitude) <= radius:
                return override
        return None

    def _matching_movement_override(self, row_id: str, first: dict, last: dict, overrides: list[object]):
        for override in overrides:
            if getattr(override, "target_kind", None) != "movement":
                continue
            if getattr(override, "row_id", None) == row_id or getattr(override, "target_key", None) == row_id:
                return override
            signature = override.signature_json or {}
            start = signature.get("start") if isinstance(signature, dict) else None
            end = signature.get("end") if isinstance(signature, dict) else None
            if not start or not end:
                continue
            start_match = self._distance_metres(first["latitude"], first["longitude"], float(start[0]), float(start[1])) <= (override.radius_metres or 260)
            end_match = self._distance_metres(last["latitude"], last["longitude"], float(end[0]), float(end[1])) <= (override.radius_metres or 260)
            if start_match and end_match:
                return override
        return None

    def _upsert_override(self, db: Session, **values):
        row_id = values.get("row_id")
        target_kind = values["target_kind"]
        target_key = values["target_key"]
        row = None
        if row_id:
            row = db.scalar(select(LocationTagOverrideReal).where(LocationTagOverrideReal.row_id == row_id))
        if not row:
            row = db.scalar(
                select(LocationTagOverrideReal)
                .where(LocationTagOverrideReal.target_kind == target_kind)
                .where(LocationTagOverrideReal.target_key == target_key)
            )
        if not row:
            row = LocationTagOverrideReal(target_kind=target_kind, target_key=target_key)
            db.add(row)
        for key, value in values.items():
            setattr(row, key, value)
        return row

    @staticmethod
    def _serialize_override(override) -> dict | None:
        if not override:
            return None
        return {
            "rowId": override.row_id,
            "targetKind": override.target_kind,
            "targetKey": override.target_key,
            "label": override.label,
            "category": override.category,
            "movementType": override.movement_type,
            "tone": override.tone,
        }

    @staticmethod
    def _stable_key(value: str) -> str:
        return hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]

    def _derive_category(self, place_key: str, dwell_minutes: int, last_timestamp: str) -> str:
        if place_key == "home":
            return "home"
        hour = datetime.fromisoformat(last_timestamp).hour
        if dwell_minutes >= 180 and 8 <= hour <= 18:
            return "work"
        if 45 <= dwell_minutes <= 110:
            return "gym"
        if dwell_minutes <= 35:
            return "errands"
        if 17 <= hour <= 23:
            return "social"
        return "misc"

    def _place_label(self, place_key: str, category: str, index: int) -> str:
        if place_key == "home":
            return "Home"
        if category == "work":
            return "Work Base"
        if category == "social":
            return f"Social Spot {index + 1}"
        if category == "gym":
            return f"Movement Spot {index + 1}"
        if category == "errands":
            return f"Errand Loop {index + 1}"
        return f"Place {index + 1}"

    @staticmethod
    def _suggested_label(place_key: str, category: str | None) -> str:
        if place_key == "home":
            return "Home"
        if category == "work":
            return "Work Base"
        if category == "social":
            return "Social Spot"
        if category == "gym":
            return "Movement Spot"
        if category == "errands":
            return "Errand Loop"
        return "Place"

    @staticmethod
    def _default_tone(category: str, has_companion_context: bool) -> str:
        if category in {"social", "gym"} or has_companion_context:
            return "positive"
        if category in {"work", "errands", "transit"}:
            return "draining"
        return "neutral"

    @staticmethod
    def _visit_highlight(category: str, dwell_minutes: int, companion) -> str:
        if companion is not None and companion.context_label:
            return companion.context_label
        if companion is not None and companion.person_ids:
            count = len(companion.person_ids)
            return f"{count} companion{'s' if count != 1 else ''} tagged"
        if category == "home":
            return "Base camp for the day"
        if category == "social":
            return "Likely shared energy"
        if dwell_minutes >= 90:
            return "Longer high-presence stop"
        return "Short transition or errand"

    @staticmethod
    def _confidence_for_place(visit_count: int, total_minutes: int) -> float:
        return min(0.98, round(0.35 + min(visit_count, 8) * 0.06 + min(total_minutes, 600) / 2000, 2))

    @staticmethod
    def _place_insight(row, average_dwell_minutes: int) -> str:
        label = row.label or LocationIntelligenceService._suggested_label(row.place_key, row.category)
        if row.status == "merged" and row.merged_into_key:
            return f"{label} was merged into {row.merged_into_key} so the map keeps one coherent place memory."
        if row.split_from_key:
            return f"{label} was split out from {row.split_from_key} and is still building confidence."
        if row.tone == "positive":
            return f"{label} is trending regulating, with about {average_dwell_minutes} minutes per visit."
        if row.tone == "draining":
            return f"{label} is behaving like a demanding place, especially when visits stack up."
        if (row.confidence_score or 0) < 0.55:
            return f"{label} is still a low-confidence cluster and may need merge or rename decisions."
        return f"{label} looks stable enough to use in stories and weekly recap scenes."

    @staticmethod
    def _history_counts(db: Session) -> dict[str, int]:
        rows = db.scalars(select(LocationPlaceHistoryReal)).all()
        counts: dict[str, int] = defaultdict(int)
        for row in rows:
            counts[row.place_key] += 1
        return counts

    @staticmethod
    def _resolve_window(period: str | None, start_date: str | None, end_date: str | None) -> tuple[date, date]:
        if start_date and end_date:
            return datetime.fromisoformat(start_date).date(), datetime.fromisoformat(end_date).date()
        if end_date and not start_date:
            end = datetime.fromisoformat(end_date).date()
            return end - timedelta(days=6), end
        return date_window(period or "this-week")

    @staticmethod
    def _default_selected_date(summaries: list[object], rows: list[object], end: date) -> str:
        if summaries:
            return summaries[-1].date.isoformat()
        if rows:
            return rows[-1].timestamp.date().isoformat()
        return end.isoformat()

    @classmethod
    def _estimate_visit_dwell_minutes(cls, group: list[dict], next_group: list[dict] | None) -> int:
        first_at = datetime.fromisoformat(group[0]["timestamp"])
        last_at = datetime.fromisoformat(group[-1]["timestamp"])
        observed_minutes = max(0, int((last_at - first_at).total_seconds() // 60))

        if next_group:
            next_at = datetime.fromisoformat(next_group[0]["timestamp"])
            transition_minutes = max(0, int((next_at - first_at).total_seconds() // 60))
            return cls._clamp_visit_minutes(max(observed_minutes, transition_minutes))

        if observed_minutes:
            return cls._clamp_visit_minutes(observed_minutes)

        return 0

    @staticmethod
    def _clamp_visit_minutes(minutes: int) -> int:
        return max(0, min(minutes, LocationIntelligenceService.VISIT_BREAK_GAP_MINUTES))

    @staticmethod
    def _clamp_day_minutes(minutes: int) -> int:
        return max(0, min(minutes, 24 * 60))

    @staticmethod
    def _format_minutes(total_minutes: int) -> str:
        hours = total_minutes // 60
        minutes = total_minutes % 60
        if hours == 0:
            return f"{minutes}m"
        if minutes == 0:
            return f"{hours}h"
        return f"{hours}h {minutes}m"

    @staticmethod
    def _distance_metres(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        radius = 6_371_000
        phi1 = radians(lat1)
        phi2 = radians(lat2)
        delta_phi = radians(lat2 - lat1)
        delta_lambda = radians(lon2 - lon1)
        a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return radius * c
