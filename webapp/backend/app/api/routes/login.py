from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.user import UserLogin
from app.core.config import settings
from app.core.db import get_db
from app.core.security import verify_password
from app.repositories.user import UserRepository

router = APIRouter(prefix="/login", tags=["login"])