from __future__ import annotations

from datetime import UTC, date, datetime
from math import atan2, cos, radians, sin, sqrt

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models.life_data import LocationDailySummaryReal, LocationDataReal


class LocationSummaryService:
    HOME_RADIUS_METRES = 100

    async def summarise_day(self, target_date: date, db: Session) -> LocationDailySummaryReal:
        start = datetime(target_date.year, target_date.month, target_date.day, tzinfo=UTC).replace(tzinfo=None)
        end = start.replace(hour=23, minute=59, second=59)
        points = db.scalars(
            select(LocationDataReal)
            .where(LocationDataReal.timestamp.between(start, end))
            .order_by(LocationDataReal.timestamp)
        ).all()

        record = db.scalar(select(LocationDailySummaryReal).where(LocationDailySummaryReal.date == target_date))
        if not record:
            record = LocationDailySummaryReal(date=target_date)
            db.add(record)

        if not points:
            record.home_hours = 0
            record.gym_visits = 0
            record.social_venue_visits = 0
            record.new_places_visited = 0
            record.commute_detected = False
            record.time_outdoors_minutes = 0
            db.commit()
            db.refresh(record)
            return record

        home_seconds = 0.0
        place_cells: set[tuple[int, int]] = set()
        previous = None
        for point in points:
            if previous is not None:
                delta = (point.timestamp - previous.timestamp).total_seconds()
                if self._distance_metres(previous.latitude, previous.longitude, settings.USER_LATITUDE, settings.USER_LONGITUDE) <= self.HOME_RADIUS_METRES:
                    home_seconds += max(delta, 0)
            place_cells.add((round(point.latitude, 3), round(point.longitude, 3)))
            previous = point

        away_points = [p for p in points if self._distance_metres(p.latitude, p.longitude, settings.USER_LATITUDE, settings.USER_LONGITUDE) > self.HOME_RADIUS_METRES]
        record.home_hours = round(home_seconds / 3600, 2)
        record.gym_visits = 0
        record.social_venue_visits = 1 if away_points else 0
        record.new_places_visited = max(0, len(place_cells) - 1)
        record.commute_detected = len(place_cells) >= 3
        record.time_outdoors_minutes = max(0, round((len(away_points) / max(1, len(points))) * 12 * len(points)))

        db.commit()
        db.refresh(record)
        return record

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
