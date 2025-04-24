import pymysql
from fastapi import HTTPException
from typing import List, Dict, Any
from loguru import logger # Import loguru

def get_all_coaches(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all coaches from the database with their staff information.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.StaffID, c.Description, c.url as image_url, s.Name
                FROM Coach c
                JOIN Staff s ON c.StaffID = s.StaffID
                """
            )
            coaches = cursor.fetchall()
            if not coaches:
                 logger.info("No coaches found in the database.") # Log info if no coaches found
            return coaches
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching all coaches: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching all coaches: {e}") # Log exception with traceback
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

def get_coach_by_id(coach_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Get a specific coach by StaffID with their staff information.
    """
    if coach_id <= 0:
        logger.warning(f"Attempted to fetch coach with invalid ID: {coach_id}")
        raise HTTPException(status_code=400, detail="Invalid Coach ID provided.")

    coach = None # Initialize coach to None
    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.StaffID, c.Description, c.url as image_url, s.Name
                FROM Coach c
                JOIN Staff s ON c.StaffID = s.StaffID
                WHERE c.StaffID = %s
                """,
                (coach_id,)
            )
            coach = cursor.fetchone()
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching coach ID {coach_id}: {db_err}")
        # Keep detail generic for production
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error fetching coach ID {coach_id}: {e}") # Log exception with traceback
        raise HTTPException(status_code=500, detail="Internal Server Error")

    # Check if coach was found *after* the try-except block
    if not coach:
        logger.warning(f"Coach with ID {coach_id} not found.")
        raise HTTPException(status_code=404, detail=f"Coach with ID {coach_id} not found")

    return coach