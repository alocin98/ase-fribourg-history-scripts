from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.routing import APIRoute

from app.api.main import api_router
from app.core.config import settings
from app.core.htr import HTRPipeline

def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the models once per worker instead of once per request.
    app.state.htr = HTRPipeline()
    yield

app = FastAPI(
    title=f"{settings.API_TITLE}",
    openapi_url=f"{settings.API_STR}/openapi.json",
    description=f"{settings.API_DESCRIPTION}",
    version=f"{settings.API_VERSION}",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

app.include_router(api_router, prefix=f"{settings.API_STR}")
