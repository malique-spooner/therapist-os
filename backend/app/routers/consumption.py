from collections import Counter, defaultdict
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import MusicDataDemo, MusicDataReal
from ..models.source_data import ChromeBookmark, ChromeHistoryEvent, YoutubeSearchEvent, YoutubeSubscription, YoutubeWatchEvent
from ..services.data_sources import DataSourceService
from ..services.ingestion.spotify import SpotifyIngestionService
from ..services.data_mode import read_dataset_model
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


def _media_days(start: date, end: date, db: Session) -> list[dict]:
    days: dict[date, dict] = {}
    music_model = read_dataset_model(None, MusicDataReal, MusicDataDemo)

    for row in db.scalars(
        select(music_model).where(music_model.date.between(start, end)).order_by(music_model.date)
    ).all():
        days[row.date] = _serialize_music(row)

    chrome_domains: dict[date, Counter[str]] = defaultdict(Counter)
    chrome_pages: dict[date, Counter[tuple[str, str]]] = defaultdict(Counter)
    for row in db.scalars(
        select(ChromeHistoryEvent).where(ChromeHistoryEvent.visited_at.is_not(None)).order_by(ChromeHistoryEvent.visited_at)
    ).all():
        if not row.visited_at:
            continue
        day = row.visited_at.date()
        if day < start or day > end:
            continue
        payload = days.setdefault(
            day,
            {
                "date": day.isoformat(),
                "listeningHours": 0,
                "averageValence": None,
                "averageEnergy": None,
                "averageDanceability": None,
                "newDiscoveries": 0,
                "topGenres": [],
                "topTracks": [],
                "providerBreakdown": {},
            },
        )
        provider = payload.setdefault("providerBreakdown", {})
        chrome = provider.setdefault(
            "chrome",
            {
                "label": "Chrome",
                "visitCount": 0,
                "uniqueDomains": 0,
                "topDomains": [],
                "topPages": [],
                "bookmarks": 0,
            },
        )
        chrome["visitCount"] += 1
        if row.domain:
            chrome_domains[day][row.domain] += 1
        page_key = (row.title or row.url or "Untitled", row.url or "")
        chrome_pages[day][page_key] += 1

    youtube_watch_channels: dict[date, Counter[str]] = defaultdict(Counter)
    youtube_watch_videos: dict[date, Counter[tuple[str, str]]] = defaultdict(Counter)
    youtube_search_queries: dict[date, Counter[str]] = defaultdict(Counter)
    for row in db.scalars(select(YoutubeWatchEvent).where(YoutubeWatchEvent.watched_at.is_not(None)).order_by(YoutubeWatchEvent.watched_at)).all():
        if not row.watched_at:
            continue
        day = row.watched_at.date()
        if day < start or day > end:
            continue
        payload = days.setdefault(
            day,
            {
                "date": day.isoformat(),
                "listeningHours": 0,
                "averageValence": None,
                "averageEnergy": None,
                "averageDanceability": None,
                "newDiscoveries": 0,
                "topGenres": [],
                "topTracks": [],
                "providerBreakdown": {},
            },
        )
        provider = payload.setdefault("providerBreakdown", {})
        youtube = provider.setdefault(
            "youtube",
            {
                "label": "YouTube",
                "watchCount": 0,
                "searchCount": 0,
                "subscriptionCount": 0,
                "topChannels": [],
                "topSearches": [],
                "topVideos": [],
            },
        )
        youtube["watchCount"] += 1
        if row.channel_name:
            youtube_watch_channels[day][row.channel_name] += 1
        video_key = (row.title or "Unknown video", row.channel_name or "Unknown channel")
        youtube_watch_videos[day][video_key] += 1

    for row in db.scalars(select(YoutubeSearchEvent).where(YoutubeSearchEvent.searched_at.is_not(None)).order_by(YoutubeSearchEvent.searched_at)).all():
        if not row.searched_at:
            continue
        day = row.searched_at.date()
        if day < start or day > end:
            continue
        payload = days.setdefault(
            day,
            {
                "date": day.isoformat(),
                "listeningHours": 0,
                "averageValence": None,
                "averageEnergy": None,
                "averageDanceability": None,
                "newDiscoveries": 0,
                "topGenres": [],
                "topTracks": [],
                "providerBreakdown": {},
            },
        )
        provider = payload.setdefault("providerBreakdown", {})
        youtube = provider.setdefault(
            "youtube",
            {
                "label": "YouTube",
                "watchCount": 0,
                "searchCount": 0,
                "subscriptionCount": 0,
                "topChannels": [],
                "topSearches": [],
                "topVideos": [],
            },
        )
        youtube["searchCount"] += 1
        if row.query:
            youtube_search_queries[day][row.query] += 1

    for row in db.scalars(select(YoutubeSubscription).order_by(YoutubeSubscription.created_at)).all():
        day = row.created_at.date()
        if day < start or day > end:
            continue
        payload = days.setdefault(
            day,
            {
                "date": day.isoformat(),
                "listeningHours": 0,
                "averageValence": None,
                "averageEnergy": None,
                "averageDanceability": None,
                "newDiscoveries": 0,
                "topGenres": [],
                "topTracks": [],
                "providerBreakdown": {},
            },
        )
        provider = payload.setdefault("providerBreakdown", {})
        youtube = provider.setdefault(
            "youtube",
            {
                "label": "YouTube",
                "watchCount": 0,
                "searchCount": 0,
                "subscriptionCount": 0,
                "topChannels": [],
                "topSearches": [],
                "topVideos": [],
            },
        )
        youtube["subscriptionCount"] += 1

    for day, payload in days.items():
        provider = payload.setdefault("providerBreakdown", {})
        chrome = provider.get("chrome")
        if chrome:
            chrome["uniqueDomains"] = len(chrome_domains[day])
            chrome["topDomains"] = [{"domain": domain, "count": count} for domain, count in chrome_domains[day].most_common(5)]
            chrome["topPages"] = [
                {"title": title, "url": url, "count": count}
                for (title, url), count in chrome_pages[day].most_common(5)
            ]
            chrome["bookmarks"] = db.scalar(
                select(func.count())
                .select_from(ChromeBookmark)
                .where(
                    ChromeBookmark.created_at.between(
                        datetime.combine(day, datetime.min.time()),
                        datetime.combine(day, datetime.max.time()),
                    )
                )
            ) or 0
        youtube = provider.get("youtube")
        if youtube:
            youtube["topChannels"] = [
                {"name": name, "count": count}
                for name, count in youtube_watch_channels[day].most_common(5)
            ]
            youtube["topSearches"] = [
                {"query": query, "count": count}
                for query, count in youtube_search_queries[day].most_common(5)
            ]
            youtube["topVideos"] = [
                {"title": title, "channel": channel, "count": count}
                for (title, channel), count in youtube_watch_videos[day].most_common(5)
            ]

    return [days[key] for key in sorted(days)]

@router.get("")
def get_consumption(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    return _media_days(start, end, db)


@router.get("/today")
def get_consumption_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    music_model = read_dataset_model(mode, MusicDataReal, MusicDataDemo)
    row = db.scalar(select(music_model).order_by(music_model.date.desc()))
    if not row:
        raise HTTPException(status_code=404, detail="Media data not available")
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
