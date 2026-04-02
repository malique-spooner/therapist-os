from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from ..core.logging import get_logger, request_id_ctx

logger = get_logger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "request_completed",
                extra={
                    "event": "request_completed",
                    "extra_data": {
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                    },
                },
            )
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_ctx.reset(token)
