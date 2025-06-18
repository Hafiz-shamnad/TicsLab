from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from auth.models import Base
from auth.utils import engine
from config import CORS_ORIGINS
from auth.routes import router as auth_router
from repos.routes import router as repo_router
from repos.files_routes import router as files_router



# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup rate limiter (shared across app)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Include auth routes
app.include_router(auth_router)

app.include_router(repo_router, prefix="/api/repos")
app.include_router(files_router, prefix="/api")
