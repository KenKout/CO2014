import pymysql
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional
from app.models.enums import FeedbackType
from loguru import logger
from datetime import datetime

def get_all_feedback_admin(
    db: pymysql.connections.Connection,
    customer_id: Optional[int] = None,
    feedback_on: Optional[FeedbackType] = None,
    target_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Admin: Get all feedback, optionally filtered.
    Includes Customer Name and basic Target Details.
    """
    try:
        with db.cursor() as cursor:
            base_sql = """
            SELECT 
                fb.FeedbackID, fb.CustomerID, fb.Content, fb.Title, 
                fb.ON, fb.Rate, fb.CourtID, fb.SessionID,
                c.Name as CustomerName,
                ct.Type as CourtType, -- For Court feedback
                ts.Type as SessionType, ts.StartDate as SessionStartDate -- For Session feedback
            FROM FeedBack fb -- Note: Table name is FeedBack in dump.sql
            LEFT JOIN Customer c ON fb.CustomerID = c.CustomerID
            LEFT JOIN Court ct ON fb.CourtID = ct.Court_ID AND fb.ON = 'Court'
            LEFT JOIN Training_Session ts ON fb.SessionID = ts.SessionID AND fb.ON = 'Session'
            """
            
            filters = []
            params = []
            
            if customer_id is not None:
                filters.append("fb.CustomerID = %s")
                params.append(customer_id)
            if feedback_on is not None:
                filters.append("fb.ON = %s")
                params.append(feedback_on.value)
                # Add target_id filter only if feedback_on is specified
                if target_id is not None:
                    if feedback_on == FeedbackType.COURT:
                        filters.append("fb.CourtID = %s")
                        params.append(target_id)
                    elif feedback_on == FeedbackType.SESSION:
                        filters.append("fb.SessionID = %s")
                        params.append(target_id)
            
            if filters:
                base_sql += " WHERE " + " AND ".join(filters)
            
            base_sql += " ORDER BY fb.FeedbackID DESC" # Order by ID

            cursor.execute(base_sql, tuple(params))
            feedback_list = cursor.fetchall()

            if not feedback_list:
                logger.info("Admin: No feedback found matching the criteria.")
            
            # Format TargetDetails
            for fb in feedback_list:
                if fb.get("ON") == FeedbackType.COURT.value:
                    fb["TargetDetails"] = f"Court {fb.get('CourtID')} ({fb.get('CourtType')})"
                elif fb.get("ON") == FeedbackType.SESSION.value:
                     start_date_str = fb.get("SessionStartDate").isoformat() if isinstance(fb.get("SessionStartDate"), datetime) else "N/A"
                     fb["TargetDetails"] = f"{fb.get('SessionType')} Session (ID: {fb.get('SessionID')}, Start: {start_date_str})"
                else:
                     fb["TargetDetails"] = "N/A"


            logger.info(f"Admin fetched {len(feedback_list)} feedback entries.")
            return feedback_list

    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching feedback: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching feedback")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


def get_feedback_by_id_admin(feedback_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Get specific feedback by FeedbackID with Customer and Target details.
    Raises 404 if not found.
    """
    if feedback_id <= 0:
        logger.warning(f"Admin: Attempted to fetch feedback with invalid ID: {feedback_id}")
        raise HTTPException(status_code=400, detail="Invalid Feedback ID provided.")

    feedback = None
    try:
        with db.cursor() as cursor:
            sql = """
            SELECT 
                fb.FeedbackID, fb.CustomerID, fb.Content, fb.Title, 
                fb.ON, fb.Rate, fb.CourtID, fb.SessionID,
                c.Name as CustomerName,
                ct.Type as CourtType, -- For Court feedback
                ts.Type as SessionType, ts.StartDate as SessionStartDate -- For Session feedback
            FROM FeedBack fb -- Note: Table name is FeedBack in dump.sql
            LEFT JOIN Customer c ON fb.CustomerID = c.CustomerID
            LEFT JOIN Court ct ON fb.CourtID = ct.Court_ID AND fb.ON = 'Court'
            LEFT JOIN Training_Session ts ON fb.SessionID = ts.SessionID AND fb.ON = 'Session'
            WHERE fb.FeedbackID = %s
            """
            cursor.execute(sql, (feedback_id,))
            feedback = cursor.fetchone()

    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching feedback ID {feedback_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching feedback ID {feedback_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    if not feedback:
        logger.warning(f"Admin: Feedback with ID {feedback_id} not found.")
        raise HTTPException(status_code=404, detail=f"Feedback with ID {feedback_id} not found")

    # Format TargetDetails
    if feedback.get("ON") == FeedbackType.COURT.value:
        feedback["TargetDetails"] = f"Court {feedback.get('CourtID')} ({feedback.get('CourtType')})"
    elif feedback.get("ON") == FeedbackType.SESSION.value:
         start_date_str = feedback.get("SessionStartDate").isoformat() if isinstance(feedback.get("SessionStartDate"), datetime) else "N/A"
         feedback["TargetDetails"] = f"{feedback.get('SessionType')} Session (ID: {feedback.get('SessionID')}, Start: {start_date_str})"
    else:
         feedback["TargetDetails"] = "N/A"

    logger.info(f"Admin fetched details for feedback ID {feedback_id}.")
    return feedback


def delete_feedback_admin(feedback_id: int, db: pymysql.connections.Connection):
    """
    Admin: Delete feedback by FeedbackID.
    Raises 404 if not found.
    """
    # Check if feedback exists first
    try:
        get_feedback_by_id_admin(feedback_id, db) 
    except HTTPException as e:
        # If get_feedback_by_id_admin raises 404, re-raise it
        if e.status_code == 404:
             raise HTTPException(status_code=404, detail=f"Feedback with ID {feedback_id} not found for deletion.")
        else:
             raise e # Re-raise other potential errors from the get function

    try:
        with db.cursor() as cursor:
            # Proceed with deletion
            sql = "DELETE FROM FeedBack WHERE FeedbackID = %s" # Note table name
            logger.debug(f"Admin: Executing Feedback delete for ID {feedback_id}: {sql}")
            cursor.execute(sql, (feedback_id,))

            if cursor.rowcount == 0:
                 # Should not happen if check passed, but safety first
                 logger.warning(f"Admin: Delete for feedback ID {feedback_id} affected 0 rows.")
                 db.rollback()
                 raise HTTPException(status_code=500, detail="Failed to delete feedback record.")

            db.commit()
            logger.info(f"Admin: Successfully deleted feedback ID {feedback_id}.")
            # No body needed for 204 response

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error deleting feedback ID {feedback_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during feedback deletion")
    except Exception as e:
        db.rollback()
        logger.exception(f"Admin: Unexpected error deleting feedback ID {feedback_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during feedback deletion")