import asyncio

from apscheduler.schedulers.blocking import BlockingScheduler

from .config import settings
from .database import SessionLocal
from .services.data_sources import DataSourceService
from .services.ingestion.weather import WeatherIngestionService
from .services.ingestion.spotify import SpotifyIngestionService
from .services.profile_service import ProfileService
from .services.notifications import NotificationService


async def _sync_weather_job() -> None:
    with SessionLocal() as db:
        service = WeatherIngestionService(DataSourceService().get_runtime_config("weather", db))
        if not service.is_configured:
            return
        await service.sync_today(db)


def sync_weather_job() -> None:
    asyncio.run(_sync_weather_job())


async def _sync_spotify_job() -> None:
    with SessionLocal() as db:
        source_service = DataSourceService()
        service = SpotifyIngestionService(source_service.get_runtime_config("spotify", db))
        if not service.is_configured:
            return
        try:
            result = await service.sync_recent_listening(db)
        except RuntimeError as exc:
            source_service.mark_sync_result("spotify", success=False, db=db, error=str(exc))
            return
        source_service.mark_sync_result(
            "spotify",
            success=True,
            db=db,
            runtime_updates={"spotify_recent_after_ms": str(result.get("cursor_ms")) if result.get("cursor_ms") else None},
            rows_synced=result.get("rows_synced"),
        )


def sync_spotify_job() -> None:
    asyncio.run(_sync_spotify_job())


async def _sync_garmin_job() -> None:
    with SessionLocal() as db:
        await DataSourceService().sync("garmin", db, trigger="background")


def sync_garmin_job() -> None:
    asyncio.run(_sync_garmin_job())


async def _daily_checkin_reminder_job() -> None:
    service = NotificationService()
    with SessionLocal() as db:
        await service.send_daily_checkin_reminder(db)


def daily_checkin_reminder_job() -> None:
    asyncio.run(_daily_checkin_reminder_job())


async def _weekly_summary_job() -> None:
    service = NotificationService()
    with SessionLocal() as db:
        await service.send_weekly_summary(db)


def weekly_summary_job() -> None:
    asyncio.run(_weekly_summary_job())


async def _budget_warning_job() -> None:
    service = NotificationService()
    with SessionLocal() as db:
        await service.send_budget_warning(db)


def budget_warning_job() -> None:
    asyncio.run(_budget_warning_job())


async def _profile_refresh_job() -> None:
    service = ProfileService()
    with SessionLocal() as db:
        await service.update_profile(db)


def profile_refresh_job() -> None:
    asyncio.run(_profile_refresh_job())


def main() -> None:
    scheduler = BlockingScheduler(timezone="Europe/London")
    scheduler.add_job(sync_spotify_job, "interval", minutes=settings.SPOTIFY_SYNC_INTERVAL_MINUTES)
    scheduler.add_job(sync_garmin_job, "cron", hour=settings.GARMIN_SYNC_HOUR, minute=settings.GARMIN_SYNC_MINUTE)
    scheduler.add_job(sync_weather_job, "cron", hour=6, minute=0)
    scheduler.add_job(sync_weather_job, "cron", hour=20, minute=0)
    scheduler.add_job(daily_checkin_reminder_job, "cron", hour=8, minute=0)
    scheduler.add_job(weekly_summary_job, "cron", day_of_week="sun", hour=9, minute=0)
    scheduler.add_job(budget_warning_job, "cron", hour=18, minute=0)
    scheduler.add_job(profile_refresh_job, "cron", day_of_week="sun", hour=3, minute=0)
    scheduler.start()


if __name__ == "__main__":
    main()
