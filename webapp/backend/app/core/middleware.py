from app.core.security import csrf_tokens_match
from app.core.config import settings

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return await call_next(request)

        csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
        csrf_header = request.headers.get(settings.CSRF_HEADER_NAME)
        if (
            not csrf_cookie
            or not csrf_header
            or not csrf_tokens_match(csrf_cookie, csrf_header)
        ):
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or missing CSRF token"},
            )

        return await call_next(request)