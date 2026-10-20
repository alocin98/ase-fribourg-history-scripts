from fastapi import APIRouter

from app.api.routes import documents, login, transcriptions, user, utils, iiif

api_router = APIRouter()
api_router.include_router(documents.router)
api_router.include_router(login.router)
api_router.include_router(user.router)
api_router.include_router(utils.router)
api_router.include_router(transcriptions.router)
api_router.include_router(iiif.router)
