from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Annotated, Dict, Any
from app.env import HOST, PORT, TITLE, DESCRIPTION, VERSION, HOST, PORT, DEBUG
import uvicorn

# Import routers
from app.routers.v2.auths import router as router_auth
from app.routers.v2.public import router as router_public
from app.routers.v2.user.auth import router as router_user_auth
from app.routers.v2.user.booking import router as router_user_booking
from app.routers.v2.user.court import router as router_user_court
from app.routers.v2.user.equipment import router as router_user_equipment
from app.routers.v2.user.food import router as router_user_food
from app.routers.v2.user.training import router as router_user_training
from app.routers.v2.user.coach import router as router_user_coach
from app.routers.v2.user.order import router as router_user_order
from app.routers.v2.user.feedback import router as router_user_feedback
from app.routers.v2.user.rating import router as router_user_rating
from app.routers.v2.admin.booking import router as router_admin_booking
from app.routers.v2.admin.court import router as router_admin_court
from app.routers.v2.admin.equipment import router as router_admin_equipment
from app.routers.v2.admin.food import router as router_admin_food
from app.routers.v2.admin.training import router as router_admin_training
from app.routers.v2.admin.schedule import router as router_admin_schedule
from app.routers.v2.admin.order import router as router_admin_order
from app.routers.v2.admin.payment import router as router_admin_payment
from app.routers.v2.admin.feedback import router as router_admin_feedback
from app.routers.v2.admin.rating import router as router_admin_rating
from app.routers.v2.admin.staff import router as router_admin_staff
from app.routers.v2.admin.coach import router as router_admin_coach
from app.routers.v2.admin.customer import router as router_admin_customer
from app.routers.v2.admin.user import router as router_admin_user

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
app.include_router(router_auth, prefix="/v2")
app.include_router(router_public, prefix="/v2")
app.include_router(router_user_auth, prefix="/v2")
app.include_router(router_user_booking, prefix="/v2")
app.include_router(router_user_court, prefix="/v2")
app.include_router(router_user_equipment, prefix="/v2")
app.include_router(router_user_food, prefix="/v2")
app.include_router(router_user_training, prefix="/v2")
app.include_router(router_user_coach, prefix="/v2")
app.include_router(router_user_order, prefix="/v2")
app.include_router(router_user_feedback, prefix="/v2")
app.include_router(router_user_rating, prefix="/v2")
app.include_router(router_admin_booking, prefix="/v2")
app.include_router(router_admin_court, prefix="/v2")
app.include_router(router_admin_equipment, prefix="/v2")
app.include_router(router_admin_food, prefix="/v2")
app.include_router(router_admin_training, prefix="/v2")
app.include_router(router_admin_schedule, prefix="/v2")
app.include_router(router_admin_order, prefix="/v2")
app.include_router(router_admin_payment, prefix="/v2")
app.include_router(router_admin_feedback, prefix="/v2")
app.include_router(router_admin_rating, prefix="/v2")
app.include_router(router_admin_staff, prefix="/v2")
app.include_router(router_admin_coach, prefix="/v2")
app.include_router(router_admin_customer, prefix="/v2")
app.include_router(router_admin_user, prefix="/v2")

# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, str]:
    """Health check endpoint to verify service is running."""
    return {"status": "ok"}

# Run the application with uvicorn when this script is executed directly
if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEBUG)