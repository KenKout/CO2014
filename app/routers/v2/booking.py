from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from sqlalchemy import text


from app.database import get_db
from pydantic import BaseModel, Field


# Pydantic Schemas
class BookingBase(BaseModel):
    CustomerID: int
    CourtID: int
    Date: datetime
    StartTime: datetime
    Endtime: datetime
    Status: bool
    TotalPrice: int
    OrderID: Optional[int]


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    CustomerID: Optional[int]
    CourtID: Optional[int]
    Date: Optional[datetime]
    StartTime: Optional[datetime]
    Endtime: Optional[datetime]
    Status: Optional[bool]
    TotalPrice: Optional[int]
    OrderID: Optional[int]


class BookingOut(BookingBase):
    BookingID: int


# FastAPI router
router = APIRouter(
    prefix="/bookings",
    tags=["Booking"]
)

# Get all bookings
@router.get("/", response_model=List[BookingOut])
def get_all_bookings(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    sql = """
        SELECT * FROM booking
        ORDER BY BookingID
        LIMIT :limit OFFSET :skip
    """
    result = db.execute(text(sql), {"limit": limit, "skip": skip})
    return [dict(row) for row in result.fetchall()]

# Get booking by ID
@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    sql = "SELECT * FROM booking WHERE BookingID = :booking_id"
    result = db.execute(text(sql), {"booking_id": booking_id}).fetchone()
    if not result:
        raise HTTPException(404, f"Booking with ID {booking_id} not found")
    return dict(result)

# Create booking
@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    sql = """
        INSERT INTO booking (CustomerID, CourtID, Date, StartTime, Endtime, Status, TotalPrice, OrderID)
        VALUES (:CustomerID, :CourtID, :Date, :StartTime, :Endtime, :Status, :TotalPrice, :OrderID)
    """
    values = booking.dict()
    db.execute(text(sql), values)
    db.commit()

    # Fetch the last inserted ID
    new_id = db.execute("SELECT LAST_INSERT_ID()").scalar()
    return get_booking(new_id, db)

# Update booking
@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(booking_id: int, booking_update: BookingUpdate, db: Session = Depends(get_db)):
    update_data = {k: v for k, v in booking_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")

    set_clause = ", ".join([f"{key} = :{key}" for key in update_data])
    sql = f"UPDATE booking SET {set_clause} WHERE BookingID = :BookingID"
    update_data["BookingID"] = booking_id

    result = db.execute(sql, update_data)
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(404, f"Booking with ID {booking_id} not found")

    return get_booking(booking_id, db)

# Delete booking
@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    sql = "DELETE FROM booking WHERE BookingID = :booking_id"
    result = db.execute(sql, {"booking_id": booking_id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(404, f"Booking with ID {booking_id} not found")
    return None
