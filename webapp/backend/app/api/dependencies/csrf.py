from app.core.config import settings
from fastapi.security import APIKeyHeader

csrf_header = APIKeyHeader(
    name=settings.CSRF_HEADER_NAME,
    scheme_name="CSRF token",
    auto_error=False,
)