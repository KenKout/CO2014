import pymysql
from fastapi import HTTPException
from typing import List, Dict, Any
from app.models.enums import TrainingSessionType # Keep if needed, based on dump.sql
from loguru import logger # Import loguru

def get_all_training_sessions(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all training sessions from the database.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT ts.SessionID, ts.StartDate, ts.EndDate, ts.CoachID, ts.CourtID,
                       ts.Schedule, ts.Type, ts.Price, ts.Max_Students, ts.Status, ts.Rating,
                       s.Name as CoachName, c.url as coach_image_url
                FROM Training_Session ts
                JOIN Coach c ON ts.CoachID = c.StaffID
                JOIN Staff s ON c.StaffID = s.StaffID
                """
            )
            sessions = cursor.fetchall()
            if not sessions:
                logger.info("No training sessions found in the database.")
            return sessions
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching all training sessions: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching all training sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

def get_training_session_by_id(session_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Get a specific training session by ID.
    """
    if session_id <= 0:
        logger.warning(f"Attempted to fetch training session with invalid ID: {session_id}")
        raise HTTPException(status_code=400, detail="Invalid Session ID provided.")

    session = None # Initialize session to None
    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT ts.SessionID, ts.StartDate, ts.EndDate, ts.CoachID, ts.CourtID,
                       ts.Schedule, ts.Type, ts.Price, ts.Max_Students, ts.Status, ts.Rating,
                       s.Name as CoachName, c.url as coach_image_url
                FROM Training_Session ts
                JOIN Coach c ON ts.CoachID = c.StaffID
                JOIN Staff s ON c.StaffID = s.StaffID
                WHERE ts.SessionID = %s
                """,
                (session_id,)
            )
            session = cursor.fetchone()
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching training session ID {session_id}: {db_err}")
        # Keep detail generic for production, but log specific error
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error fetching training session ID {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    # Check if session was found *after* the try-except block
    if not session:
        logger.warning(f"Training session with ID {session_id} not found.")
        raise HTTPException(status_code=404, detail=f"Training session with ID {session_id} not found")

    return session

def get_training_sessions_by_coach(coach_id: int, db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all training sessions for a specific coach.
    """
    if coach_id <= 0:
        logger.warning(f"Attempted to fetch training sessions for invalid coach ID: {coach_id}")
        raise HTTPException(status_code=400, detail="Invalid Coach ID provided.")

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT ts.SessionID, ts.StartDate, ts.EndDate, ts.CoachID, ts.CourtID,
                       ts.Schedule, ts.Type, ts.Price, ts.Max_Students, ts.Status, ts.Rating,
                       s.Name as CoachName, c.url as coach_image_url
                FROM Training_Session ts
                JOIN Coach c ON ts.CoachID = c.StaffID
                JOIN Staff s ON c.StaffID = s.StaffID
                WHERE ts.CoachID = %s
                """,
                (coach_id,)
            )
            sessions = cursor.fetchall()
            if not sessions:
                 logger.info(f"No training sessions found for coach ID {coach_id}.")
            return sessions
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching training sessions for coach ID {coach_id}: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching training sessions for coach ID {coach_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")