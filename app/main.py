from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Annotated, Dict, Any
from app.env import HOST, PORT, TITLE, DESCRIPTION, VERSION, HOST, PORT, DEBUG
import uvicorn

# Import routers
# from app.routers.v1.demo import demo_router
# from app.routers.v2.booking import router
from app.routers.v2.customer import router_customer
from app.routers.v2.user import router_user
# Import database initialization
from app.models import create_tables

# Create database tables if they don't exist
create_tables()

# Initialize FastAPI app
app = FastAPI(
    title=TITLE,
    description=DESCRIPTION,
    version=VERSION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    append_slash=False,  # Disable automatic trailing slash addition
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# app.include_router(demo_router, prefix="/v1")
# app.include_router(router, prefix="/v2")
app.include_router(router_user, prefix="/v2")
app.include_router(router_customer, prefix="/v2")
# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, str]:
    """Health check endpoint to verify service is running."""
    return {"status": "ok"}

# Run the application with uvicorn when this script is executed directly
if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEBUG)