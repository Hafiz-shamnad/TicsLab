# backend/routes.py

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from auth.models import User
from auth.schemas import RegisterSchema, LoginSchema
from auth.utils import get_password_hash, verify_password, create_access_token, get_db

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("tics")


@router.post("/auth/register")
async def register(user: RegisterSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name
    )
    db.add(new_user)
    db.commit()
    logger.info(f"Registered new user: {user.email}")
    return {"msg": "User created successfully"}


@router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        logger.warning(f"Failed login attempt: {credentials.email}")
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.email})
    logger.info(f"User logged in: {credentials.email}")
    return {"access_token": access_token, "token_type": "bearer"}
