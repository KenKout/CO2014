from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Annotated, Dict, Any
from app.env import HOST, PORT, TITLE, DESCRIPTION, VERSION, HOST, PORT, DEBUG
from app.utils.auth import get_current_user
import uvicorn

# Import routers
from app.routers.v1.auths import router as router_auth
from app.routers.v1.public.court import router as router_court
from app.routers.v1.public.coach import coach_router # Updated import
from app.routers.v1.public.training_session import training_router # Updated import
from app.routers.v1.public.equipment import equipment_router
from app.routers.v1.public.food import food_router
from app.routers.v1.user.order import order_router as router_user_order # Import user order router
from app.routers.v1.user.training_session import router as router_user_training_session # Import user training session router
# Import admin routers
from app.routers.v1.admin.user import admin_user_router
from app.routers.v1.admin.staff import admin_staff_router
from app.routers.v1.admin.coach import admin_coach_router
from app.routers.v1.admin.training_session import admin_training_router # New
from app.routers.v1.admin.booking import admin_booking_router # New
from app.routers.v1.admin.food import admin_food_router # New
from app.routers.v1.admin.equipment import admin_equipment_router # New
from app.routers.v1.admin.enrollment import admin_enrollment_router # New
from app.routers.v1.admin.feedback import admin_feedback_router # New

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
app.include_router(router_auth, prefix="/v1")
app.include_router(router_court, prefix="/v1/public")
app.include_router(coach_router, prefix="/v1/public")
app.include_router(training_router, prefix="/v1/public")
app.include_router(equipment_router, prefix="/v1/public")
app.include_router(food_router, prefix="/v1/public")
app.include_router(router_user_order, prefix="/v1/user", dependencies=[Depends(get_current_user)]) # Include user order router with auth dependency
app.include_router(router_user_training_session, prefix="/v1/user", dependencies=[Depends(get_current_user)]) # Include user training session router with auth dependency
# Include admin routers
app.include_router(admin_user_router, prefix="/v1/admin")
app.include_router(admin_staff_router, prefix="/v1/admin")
app.include_router(admin_coach_router, prefix="/v1/admin")
app.include_router(admin_training_router, prefix="/v1/admin") # New
app.include_router(admin_booking_router, prefix="/v1/admin") # New
app.include_router(admin_food_router, prefix="/v1/admin") # New
app.include_router(admin_equipment_router, prefix="/v1/admin") # New
app.include_router(admin_enrollment_router, prefix="/v1/admin") # New
app.include_router(admin_feedback_router, prefix="/v1/admin") # New

# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, str]:
    """Health check endpoint to verify service is running."""
    return {"status": "ok"}

# Run the application with uvicorn when this script is executed directly
if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEBUG)