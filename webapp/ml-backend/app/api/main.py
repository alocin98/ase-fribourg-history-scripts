from fastapi import APIRouter

from app.api.routes import htr, utils

api_router = APIRouter()
api_router.include_router(htr.router)
api_router.include_router(utils.router)
