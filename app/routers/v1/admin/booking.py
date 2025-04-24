from fastapi import APIRouter, Depends, HTTPException, status, Path, Body, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
from app.models.enums import BookingStatus

# Import model functions
from app.models.booking import (
    get_all_bookings_admin,
    get_booking_by_id_admin,
    update_booking_status_admin
)

# Define the router
admin_booking_router = APIRouter(
    prefix="/bookings",
    tags=["Admin - Bookings"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

# Response model for listing/getting bookings
class BookingDetailResponse(BaseModel):
    BookingID: int
    CustomerID: int
    CourtID: int
    StartTime: datetime
    Endtime: datetime
    Status: BookingStatus
    TotalPrice: Optional[int] = None
    OrderID: Optional[int] = None
    # Consider adding Customer Name and Court Info by joining in the model
    CustomerName: Optional[str] = None
    CourtInfo: Optional[str] = None # e.g., "Court 1 (Normal)"

# Request model for updating booking status
class BookingStatusUpdateRequest(BaseModel):
    status: BookingStatus = Field(..., description="The new status for the booking (Success or Cancel).")

# --- Routes ---

# Placeholder for GET /
@admin_booking_router.get("/", response_model=List[BookingDetailResponse])
async def get_all_bookings(
    customer_id: Optional[int] = Query(None, description="Filter by CustomerID"),
    court_id: Optional[int] = Query(None, description="Filter by CourtID"),
    status: Optional[BookingStatus] = Query(None, description="Filter by Booking Status"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve a list of all bookings, with optional filters.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch all bookings with filters: customer_id={customer_id}, court_id={court_id}, status={status}")
    try:
        bookings = get_all_bookings_admin(
            db=db,
            customer_id=customer_id,
            court_id=court_id,
            booking_status=status # Pass the enum status directly
        )
        return bookings
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching bookings: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{booking_id} - Get specific booking
@admin_booking_router.get("/{booking_id}", response_model=BookingDetailResponse)
async def get_booking_detail(
    booking_id: int = Path(..., gt=0, description="The ID of the booking to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific booking.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch booking ID: {booking_id}")
    try:
        booking = get_booking_by_id_admin(booking_id=booking_id, db=db)
        # Model function raises 404 if not found
        return booking
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching booking ID {booking_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# PUT /{booking_id}/status - Update booking status
@admin_booking_router.put("/{booking_id}/status", response_model=BookingDetailResponse)
async def update_booking_status(
    booking_id: int = Path(..., gt=0, description="The ID of the booking to update."),
    update_data: BookingStatusUpdateRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update the status of a specific booking (e.g., Success, Cancel).
    Requires admin privileges.
    """
    logger.info(f"Admin request to update status for booking ID: {booking_id} to {update_data.status}")
    try:
        updated_booking = update_booking_status_admin(
            booking_id=booking_id,
            new_status=update_data.status,
            db=db
        )
        # Model function handles 404 and returns updated details
        return updated_booking
    except HTTPException as e:
        raise e # Re-raise 404 or DB errors (500)
    except Exception as e:
        logger.exception(f"Admin: Unexpected error updating status for booking ID {booking_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")