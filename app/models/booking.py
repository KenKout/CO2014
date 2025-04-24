import pymysql
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional
from app.models.enums import BookingStatus
from loguru import logger
from datetime import datetime

def get_all_bookings_admin(
    db: pymysql.connections.Connection,
    customer_id: Optional[int] = None,
    court_id: Optional[int] = None,
    booking_status: Optional[BookingStatus] = None
) -> List[Dict[str, Any]]:
    """
    Admin: Get all bookings, optionally filtered by customer, court, or status.
    Includes Customer Name and Court Info.
    """
    try:
        with db.cursor() as cursor:
            base_sql = """
            SELECT 
                b.BookingID, b.CustomerID, b.CourtID, b.StartTime, b.Endtime, 
                b.Status, b.TotalPrice, b.OrderID,
                cust.Name as CustomerName,
                ct.Type as CourtType 
            FROM Booking b
            LEFT JOIN Customer cust ON b.CustomerID = cust.CustomerID
            LEFT JOIN Court ct ON b.CourtID = ct.Court_ID
            """
            
            filters = []
            params = []
            
            if customer_id is not None:
                filters.append("b.CustomerID = %s")
                params.append(customer_id)
            if court_id is not None:
                filters.append("b.CourtID = %s")
                params.append(court_id)
            if booking_status is not None:
                filters.append("b.Status = %s")
                params.append(booking_status.value) # Use enum value

            if filters:
                base_sql += " WHERE " + " AND ".join(filters)
            
            base_sql += " ORDER BY b.StartTime DESC" # Order by start time

            cursor.execute(base_sql, tuple(params))
            bookings = cursor.fetchall()

            if not bookings:
                logger.info("Admin: No bookings found matching the criteria.")
            
            # Format dates and add CourtInfo
            for booking in bookings:
                if isinstance(booking.get("StartTime"), datetime):
                    booking["StartTime"] = booking["StartTime"].isoformat()
                if isinstance(booking.get("Endtime"), datetime):
                    booking["Endtime"] = booking["Endtime"].isoformat()
                booking["CourtInfo"] = f"Court {booking.get('CourtID')} ({booking.get('CourtType')})"

            logger.info(f"Admin fetched {len(bookings)} bookings.")
            return bookings

    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching bookings: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching bookings")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching bookings: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


def get_booking_by_id_admin(booking_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Get a specific booking by BookingID with Customer and Court details.
    Raises 404 if not found.
    """
    if booking_id <= 0:
        logger.warning(f"Admin: Attempted to fetch booking with invalid ID: {booking_id}")
        raise HTTPException(status_code=400, detail="Invalid Booking ID provided.")

    booking = None
    try:
        with db.cursor() as cursor:
            sql = """
            SELECT 
                b.BookingID, b.CustomerID, b.CourtID, b.StartTime, b.Endtime, 
                b.Status, b.TotalPrice, b.OrderID,
                cust.Name as CustomerName,
                ct.Type as CourtType 
            FROM Booking b
            LEFT JOIN Customer cust ON b.CustomerID = cust.CustomerID
            LEFT JOIN Court ct ON b.CourtID = ct.Court_ID
            WHERE b.BookingID = %s
            """
            cursor.execute(sql, (booking_id,))
            booking = cursor.fetchone()

    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching booking ID {booking_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching booking ID {booking_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    if not booking:
        logger.warning(f"Admin: Booking with ID {booking_id} not found.")
        raise HTTPException(status_code=404, detail=f"Booking with ID {booking_id} not found")

    # Format dates and add CourtInfo
    if isinstance(booking.get("StartTime"), datetime):
        booking["StartTime"] = booking["StartTime"].isoformat()
    if isinstance(booking.get("Endtime"), datetime):
        booking["Endtime"] = booking["Endtime"].isoformat()
    booking["CourtInfo"] = f"Court {booking.get('CourtID')} ({booking.get('CourtType')})"
    
    logger.info(f"Admin fetched details for booking ID {booking_id}.")
    return booking


def update_booking_status_admin(booking_id: int, new_status: BookingStatus, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Update the status of a specific booking.
    Raises 404 if booking not found.
    """
    # Check if booking exists first
    try:
        get_booking_by_id_admin(booking_id, db) 
    except HTTPException as e:
        raise e # Re-raise 404 or other errors

    try:
        with db.cursor() as cursor:
            sql = "UPDATE Booking SET Status = %s WHERE BookingID = %s"
            logger.debug(f"Admin: Executing Booking status update for ID {booking_id} to {new_status.value}")
            cursor.execute(sql, (new_status.value, booking_id))

            if cursor.rowcount == 0:
                 logger.warning(f"Admin: Update status for booking ID {booking_id} affected 0 rows.")
                 db.rollback()
                 # Return current data as update didn't apply
                 return get_booking_by_id_admin(booking_id, db)

            db.commit()
            logger.info(f"Admin: Successfully updated status for booking ID {booking_id} to {new_status.value}.")

            # Fetch and return updated details
            return get_booking_by_id_admin(booking_id, db)

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error updating status for booking ID {booking_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during booking status update")
    except Exception as e:
        db.rollback()
        logger.exception(f"Admin: Unexpected error updating status for booking ID {booking_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during booking status update")