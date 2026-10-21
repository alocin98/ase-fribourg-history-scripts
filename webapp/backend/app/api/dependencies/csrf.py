from fastapi.security import APIKeyHeader

from app.core.config import settings

csrf_header = APIKeyHeader(
    name=settings.CSRF_HEADER_NAME,
    scheme_name="CSRF token",
    auto_error=False,
)
