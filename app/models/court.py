import pymysql
from fastapi import HTTPException
from datetime import datetime, timedelta, time
from typing import List, Dict, Optional, Any
from loguru import logger
from app.models.enums import CourtStatus, CourtType

def get_available_courts(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all available courts from the database.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM Court WHERE Status = %s",
                (CourtStatus.AVAILABLE.value,)
            )
            courts = cursor.fetchall()
            return courts
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")

def get_court_by_id(court_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Get a specific court by ID.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM Court WHERE Court_ID = %s",
                (court_id,)
            )
            court = cursor.fetchone()
            if not court:
                raise HTTPException(status_code=404, detail=f"Court with ID {court_id} not found")
            return court
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")

def get_court_bookings(
    court_id: int, 
    start_time: Optional[datetime] = None, 
    end_time: Optional[datetime] = None, 
    db: pymysql.connections.Connection = None
) -> List[Dict[str, Any]]:
    """
    Get all bookings for a specific court between start_time and end_time.
    If start_time and end_time are not provided, use working hours (5:00-23:00 UTC+7).
    """
    try:
        # If start_time and end_time are not provided, use working hours (5:00-23:00 UTC+7)
        if not start_time or not end_time:
            # Get current date in UTC+7
            now = datetime.utcnow() + timedelta(hours=7)
            start_time = datetime.combine(now.date(), time(5, 0))  # 5:00 AM
            end_time = datetime.combine(now.date(), time(23, 0))   # 11:00 PM
            # Convert back to UTC for database query
            start_time = start_time - timedelta(hours=7)
            end_time = end_time - timedelta(hours=7)
        
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM Booking 
                WHERE CourtID = %s 
                AND Status = 'Success'
                AND (
                    (StartTime BETWEEN %s AND %s) OR 
                    (EndTime BETWEEN %s AND %s) OR
                    (StartTime <= %s AND EndTime >= %s)
                )
                ORDER BY StartTime
                """,
                (court_id, start_time, end_time, start_time, end_time, start_time, end_time)
            )
            bookings = cursor.fetchall()
            return bookings
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")

def get_available_time_slots(
    court_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: pymysql.connections.Connection = None
) -> List[Dict[str, datetime]]:
    """
    Get available time slots for a specific court between start_time and end_time.
    Considers both bookings and training schedules.
    If start_time and end_time are not provided, use working hours (5:00-23:00 UTC+7).
    """
    try:
        # If start_time and end_time are not provided, use working hours (5:00-23:00 UTC+7)
        if not start_time or not end_time:
            # Get current date in UTC+7
            now = datetime.utcnow() + timedelta(hours=7)
            start_time = datetime.combine(now.date(), time(5, 0))  # 5:00 AM
            end_time = datetime.combine(now.date(), time(23, 0))   # 11:00 PM
            # Convert back to UTC for database query
            start_time = start_time - timedelta(hours=7)
            end_time = end_time - timedelta(hours=7)

        # Get all successful bookings for this court during the specified time period
        bookings = get_court_bookings(court_id, start_time, end_time, db)

        # Get training schedules for this court during the specified time period
        training_schedules = []
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT StartTime, EndTime FROM TrainingSchedule
                WHERE CourtID = %s
                AND (
                    (StartTime BETWEEN %s AND %s) OR
                    (EndTime BETWEEN %s AND %s) OR
                    (StartTime <= %s AND EndTime >= %s)
                )
                ORDER BY StartTime
                """,
                (court_id, start_time, end_time, start_time, end_time, start_time, end_time)
            )
            training_schedules = cursor.fetchall()

        # Combine bookings and training schedules into a single list of unavailable periods
        unavailable_periods = []
        for booking in bookings:
            unavailable_periods.append({
                "start": booking['StartTime'],
                "end": booking['EndTime']
            })
        for schedule in training_schedules:
            unavailable_periods.append({
                "start": schedule['StartTime'],
                "end": schedule['EndTime']
            })

        # Sort unavailable periods by start time
        unavailable_periods = sorted(unavailable_periods, key=lambda x: x['start'])

        # Initialize available time slots
        available_slots = []
        current_time = start_time

        # Iterate through unavailable periods to find gaps
        for period in unavailable_periods:
            # If there's a gap between current_time and the period start, add it
            if current_time < period["start"]:
                available_slots.append({
                    "start": current_time,
                    "end": period["start"]
                })
            # Move current_time to the end of the current unavailable period
            current_time = max(current_time, period["end"])

        # Add the final slot if there's time left after the last unavailable period
        if current_time < end_time:
            available_slots.append({
                "start": current_time,
                "end": end_time
            })

        return available_slots
    except Exception as e:
        # Log the exception for debugging
        logger.error(f"Error in get_available_time_slots: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error fetching time slots")