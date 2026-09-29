from fastapi import APIRouter

router = APIRouter(prefix="/utils", tags=["utils"])

@router.get("/health-check", summary="Health Check", description="Check the health of the API")
async def health_check() -> bool:
    return True