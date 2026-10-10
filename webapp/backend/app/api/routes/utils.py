from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db

router = APIRouter(prefix="/", tags=["utils"])

@router.get(
    "/utils/health-check",
    name="Health Check",
    description="Check the health of the API",
    status_code=status.HTTP_200_OK
)
async def health_check(
    session: AsyncSession = Depends(get_db),
) -> bool:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not reachable",
        ) from e

    return True

# ROOT ROUTE
@router.get(
    "/",
    name="Root Route",
    description="Root route of the API",
    status_code=status.HTTP_200_OK
)
async def root() -> dict:
    return {"message": "Welcome to the API!"}