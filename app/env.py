import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# FastAPI
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
VERSION = os.getenv("VERSION", "0.1.0")
TITLE = os.getenv("TITLE", "FastAPI App")
DESCRIPTION = os.getenv("DESCRIPTION", "API for FastAPI App")

# JWT
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)) # 30 minutes
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7)) # 7 days

# Email
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Payment Webhook
PAYMENT_WEBHOOK_SECRET = os.getenv("PAYMENT_WEBHOOK_SECRET", "sk-1234")
