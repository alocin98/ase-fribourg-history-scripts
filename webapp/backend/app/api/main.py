from fastapi import APIRouter

from app.api.routes import login, user, utils

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(user.router)
api_router.include_router(utils.router)