import asyncio

from apscheduler.schedulers.blocking import BlockingScheduler

from .database import SessionLocal
from .services.ingestion.weather import WeatherIngestionService
from .services.profile_service import ProfileService
from .services.notifications import NotificationService


async def _sync_weather_job() -> None:
    service = WeatherIngestionService()
    if not service.is_configured:
        return
    with SessionLocal() as db:
        await service.sync_today(db)


def sync_weather_job() -> None:
    asyncio.run(_sync_weather_job())


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
    scheduler.add_job(sync_weather_job, "cron", hour=6, minute=0)
    scheduler.add_job(sync_weather_job, "cron", hour=20, minute=0)
    scheduler.add_job(daily_checkin_reminder_job, "cron", hour=8, minute=0)
    scheduler.add_job(weekly_summary_job, "cron", day_of_week="sun", hour=9, minute=0)
    scheduler.add_job(budget_warning_job, "cron", hour=18, minute=0)
    scheduler.add_job(profile_refresh_job, "cron", day_of_week="sun", hour=3, minute=0)
    scheduler.start()


if __name__ == "__main__":
    main()
