from fastapi import APIRouter, HTTPException, Request, status

router = APIRouter(prefix="/utils", tags=["utils"])

@router.get(
    "/health-check",
    name="Health Check",
    description="Check that the models are loaded",
    status_code=status.HTTP_200_OK
)
async def health_check(request: Request) -> bool:
    if getattr(request.app.state, "htr", None) is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Models are not loaded",
        )

    return True
