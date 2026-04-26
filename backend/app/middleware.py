import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from .logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        try:
            response = await call_next(request)
            logger.info(
                f"{request.method} {request.url.path} "
                f"-> {response.status_code} ({time.time()-start:.3f}s)"
            )
            return response
        except Exception as e:
            logger.error(f"{request.method} {request.url.path} ERROR: {e}")
            raise