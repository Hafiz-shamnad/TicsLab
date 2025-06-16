from dotenv import load_dotenv
import os

load_dotenv()  # loads variables from .env into environment

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

CORS_ORIGINS = [
    "https://ticslab.dev",
    "http://localhost",
    "http://localhost:3001",
    # add other origins you want to allow
]