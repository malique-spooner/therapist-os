from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .config import settings
from .core.logging import configure_logging, get_logger
from .database import SessionLocal, engine
from .middleware.request_context import RequestContextMiddleware
from .routers import ai, checkins, consumption, dashboard, data_sources, finance, habits, health, location, nutrition, profile, relationships, weather
from .services.seed import seed_demo_data
from .validate_env import validate_settings

configure_logging(settings.LOG_LEVEL)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    validation = validate_settings()
    for warning in validation.warnings:
        logger.warning("environment_warning", extra={"event": "environment_warning", "extra_data": {"warning": warning}})
    if settings.SEED_DEMO_DATA and inspect(engine).has_table("health_data"):
        with SessionLocal() as db:
            seed_demo_data(db)
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[host.strip() for host in settings.TRUSTED_HOSTS.split(",") if host.strip()],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthcheck() -> dict:
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/readyz")
def readiness_check() -> dict:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    validation = validate_settings()
    return {
        "status": "ok" if validation.ok else "degraded",
        "database": "ok",
        "warnings": validation.warnings,
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "unhandled_exception",
        extra={
            "event": "unhandled_exception",
            "extra_data": {
                "method": request.method,
                "path": request.url.path,
            },
        },
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(finance.router, prefix=settings.API_V1_PREFIX)
app.include_router(consumption.router, prefix=settings.API_V1_PREFIX)
app.include_router(location.router, prefix=settings.API_V1_PREFIX)
app.include_router(nutrition.router, prefix=settings.API_V1_PREFIX)
app.include_router(relationships.router, prefix=settings.API_V1_PREFIX)
app.include_router(checkins.router, prefix=settings.API_V1_PREFIX)
app.include_router(habits.router, prefix=settings.API_V1_PREFIX)
app.include_router(weather.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)
app.include_router(profile.router, prefix=settings.API_V1_PREFIX)
app.include_router(data_sources.router, prefix=settings.API_V1_PREFIX)
