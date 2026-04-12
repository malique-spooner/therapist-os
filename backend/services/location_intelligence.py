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
    LocationCompanionLogDemo,
    LocationCompanionLogReal,
    LocationDailySummaryDemo,
    LocationDailySummaryReal,
    LocationDataDemo,
    LocationDataReal,
    LocationEventDemo,
    LocationEventReal,
    LocationPlaceHistoryDemo,
    LocationPlaceHistoryReal,
    LocationPlaceMemoryDemo,
    LocationPlaceMemoryReal,
)
from .data_mode import dataset_model, normalize_data_mode
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
        normalized_mode = normalize_data_mode(mode)
        start, end = self._resolve_window(period, start_date, end_date)
        start_dt = datetime(start.year, start.month, start.day)
        end_dt = datetime(end.year, end.month, end.day, 23, 59, 59)
        point_model = dataset_model(normalized_mode, LocationDataReal, LocationDataDemo)
        summary_model = dataset_model(normalized_mode, LocationDailySummaryReal, LocationDailySummaryDemo)
        companion_model = dataset_model(normalized_mode, LocationCompanionLogReal, LocationCompanionLogDemo)
        place_model = dataset_model(normalized_mode, LocationPlaceMemoryReal, LocationPlaceMemoryDemo)
        event_model = dataset_model(normalized_mode, LocationEventReal, LocationEventDemo)

        rows = db.scalars(
            select(point_model)
            .where(point_model.timestamp.between(start_dt, end_dt))
            .order_by(point_model.timestamp)
        ).all()
        summaries = db.scalars(
            select(summary_model)
            .where(summary_model.date.between(start, end))
            .order_by(summary_model.date)
        ).all()
        event_rows = db.scalars(
            select(event_model)
            .where(event_model.timestamp.between(start_dt, end_dt))
            .order_by(event_model.timestamp)
        ).all()
        selected_date = target_date or self._default_selected_date(summaries, rows, end)
        companion = db.scalar(select(companion_model).where(companion_model.date == datetime.fromisoformat(selected_date).date()))

        points = [self._serialize_point(row) for row in rows]
        summaries_payload = [self._serialize_summary(row) for row in summaries]
        selected_day = next((item for item in summaries_payload if item["date"] == selected_date), None)
        selected_day_points = [point for point in points if point["timestamp"].startswith(selected_date)]

        persisted_places = {
            row.place_key: row
            for row in db.scalars(select(place_model)).all()
        }
        visits = self._derive_visits(selected_day_points, persisted_places, companion)
        places = self._synchronise_places(visits, event_rows, persisted_places, place_model, db)
        place_history_counts = self._history_counts(normalized_mode, db)
        recap_scenes = self._build_recap_scenes(selected_day, places, visits, event_rows)

        total_minutes = sum(visit.dwell_minutes for visit in visits)
        outside_minutes = selected_day["timeOutdoorsMinutes"] if selected_day else sum(
            visit.dwell_minutes for visit in visits if visit.category != "home"
        )
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
            "mode": normalized_mode,
            "hasRealMapData": bool(points),
            "heroTitle": hero_title,
            "heroBody": hero_body,
            "summaries": summaries_payload,
            "selectedDay": selected_day,
            "points": points,
            "selectedDayPoints": selected_day_points,
            "visits": [self._serialize_visit(visit) for visit in visits],
            "places": [self._serialize_place_memory(place, history_count=place_history_counts.get(place.place_key, 0)) for place in places],
            "recapScenes": recap_scenes,
            "rangeStats": [
                {"label": "Tracked time", "value": self._format_minutes(total_minutes), "detail": f"{len(visits)} visits in the selected day"},
                {"label": "Smart places", "value": str(len(places)), "detail": "Backend clustering, confidence states, and memory"},
                {"label": "Outside time", "value": f"{outside_minutes}m", "detail": "Movement away from home base"},
                {"label": "OwnTracks events", "value": str(len(waypoint_events)), "detail": "Waypoint and geofence transitions carried into inference"},
            ],
        }

    def upsert_place(self, place_key: str, payload: dict, mode: str | None, db: Session) -> dict:
        normalized_mode = normalize_data_mode(mode or "real-only")
        place_model = dataset_model(normalized_mode, LocationPlaceMemoryReal, LocationPlaceMemoryDemo)
        history_model = dataset_model(normalized_mode, LocationPlaceHistoryReal, LocationPlaceHistoryDemo)
        row = db.scalar(select(place_model).where(place_model.place_key == place_key))
        if not row:
            row = place_model(place_key=place_key, status="active")
            db.add(row)

        before = self._serialize_place_memory(row)
        row.label = payload.get("label")
        row.category = payload.get("category")
        row.tone = payload.get("tone")
        row.note = payload.get("note")
        db.flush()
        db.add(
            history_model(
                place_key=place_key,
                action="rename" if before.get("label") != row.label and row.label else "update",
                detail_json={"before": before, "after": self._serialize_place_memory(row)},
            )
        )
        db.commit()
        db.refresh(row)
        return self._serialize_place_memory(row)

    def merge_place(self, place_key: str, target_place_key: str, mode: str | None, db: Session) -> dict:
        normalized_mode = normalize_data_mode(mode or "real-only")
        place_model = dataset_model(normalized_mode, LocationPlaceMemoryReal, LocationPlaceMemoryDemo)
        history_model = dataset_model(normalized_mode, LocationPlaceHistoryReal, LocationPlaceHistoryDemo)
        source = db.scalar(select(place_model).where(place_model.place_key == place_key))
        target = db.scalar(select(place_model).where(place_model.place_key == target_place_key))
        if source is None or target is None:
            raise KeyError("Missing source or target place")
        source.status = "merged"
        source.merged_into_key = target_place_key
        db.add(history_model(place_key=place_key, action="merge", detail_json={"targetPlaceKey": target_place_key}))
        db.commit()
        db.refresh(source)
        return self._serialize_place_memory(source)

    def split_place(self, place_key: str, new_place_key: str, label: str | None, mode: str | None, db: Session) -> dict:
        normalized_mode = normalize_data_mode(mode or "real-only")
        place_model = dataset_model(normalized_mode, LocationPlaceMemoryReal, LocationPlaceMemoryDemo)
        history_model = dataset_model(normalized_mode, LocationPlaceHistoryReal, LocationPlaceHistoryDemo)
        source = db.scalar(select(place_model).where(place_model.place_key == place_key))
        if source is None:
            raise KeyError("Missing source place")
        row = db.scalar(select(place_model).where(place_model.place_key == new_place_key))
        if not row:
            row = place_model(
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
        db.add(history_model(place_key=place_key, action="split", detail_json={"newPlaceKey": new_place_key, "label": label}))
        db.commit()
        db.refresh(row)
        return self._serialize_place_memory(row)

    def get_place_history(self, place_key: str, mode: str | None, db: Session) -> list[dict]:
        normalized_mode = normalize_data_mode(mode or "real-only")
        history_model = dataset_model(normalized_mode, LocationPlaceHistoryReal, LocationPlaceHistoryDemo)
        rows = db.scalars(
            select(history_model)
            .where(history_model.place_key == place_key)
            .order_by(history_model.created_at.desc())
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

    def _derive_visits(self, points: list[dict], persisted_places: dict[str, object], companion) -> list[Visit]:
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
            dwell_minutes = max(20 if len(group) == 1 else 15, int((datetime.fromisoformat(last["timestamp"]) - datetime.fromisoformat(first["timestamp"])).total_seconds() // 60))
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
            "timeOutdoorsMinutes": row.time_outdoors_minutes or 0,
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
    def _history_counts(mode: str, db: Session) -> dict[str, int]:
        history_model = dataset_model(mode, LocationPlaceHistoryReal, LocationPlaceHistoryDemo)
        rows = db.scalars(select(history_model)).all()
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
