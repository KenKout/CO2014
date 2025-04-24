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


# --- Admin Specific Functions ---

def get_all_coaches_admin(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Admin: Get all coaches from the database with their Staff and User information.
    """
    try:
        with db.cursor() as cursor:
            sql = """
            SELECT
                c.StaffID, c.Description, c.url,
                s.Username, s.Name, s.Salary,
                u.Phone, u.JoinDate
            FROM Coach c
            JOIN Staff s ON c.StaffID = s.StaffID
            JOIN User u ON s.Username = u.Username
            ORDER BY c.StaffID ASC
            """
            cursor.execute(sql)
            coaches = cursor.fetchall()
            
            # Format dates
            for coach in coaches:
                 if isinstance(coach.get("JoinDate"), datetime):
                    coach["JoinDate"] = coach["JoinDate"].isoformat()

            logger.info(f"Admin fetched {len(coaches)} coaches.")
            return coaches
    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching all coaches: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching coaches")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching all coaches: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


def get_coach_details_admin(staff_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Get a specific coach by StaffID with Staff and User information.
    Raises 404 if not found.
    """
    if staff_id <= 0:
        logger.warning(f"Admin: Attempted to fetch coach with invalid StaffID: {staff_id}")
        raise HTTPException(status_code=400, detail="Invalid StaffID provided.")

    coach = None
    try:
        with db.cursor() as cursor:
            sql = """
            SELECT
                c.StaffID, c.Description, c.url,
                s.Username, s.Name, s.Salary,
                u.Phone, u.JoinDate
            FROM Coach c
            JOIN Staff s ON c.StaffID = s.StaffID
            JOIN User u ON s.Username = u.Username
            WHERE c.StaffID = %s
            """
            cursor.execute(sql, (staff_id,))
            coach = cursor.fetchone()
            
            if coach and isinstance(coach.get("JoinDate"), datetime):
                 coach["JoinDate"] = coach["JoinDate"].isoformat()

    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching coach StaffID {staff_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching coach StaffID {staff_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    if not coach:
        logger.warning(f"Admin: Coach with StaffID {staff_id} not found.")
        raise HTTPException(status_code=404, detail=f"Coach with StaffID {staff_id} not found")

    logger.info(f"Admin fetched details for coach StaffID {staff_id}.")
    return coach


def update_coach_admin(staff_id: int, db: pymysql.connections.Connection, update_data) -> Dict[str, Any]:
    """
    Admin: Update coach details (Description, url) by StaffID.
    update_data is a Pydantic model instance (CoachUpdateRequest).
    Raises 404 if coach not found.
    """
    if staff_id <= 0:
        logger.warning(f"Admin: Attempted to update coach with invalid StaffID: {staff_id}")
        raise HTTPException(status_code=400, detail="Invalid StaffID provided.")

    # Check if coach exists first
    try:
        get_coach_details_admin(staff_id, db) # Re-use get function to check existence and raise 404 if needed
    except HTTPException as e:
        raise e # Re-raise 404 or other errors from get_coach_details_admin

    updates = []
    params = []
    if update_data.description is not None:
        updates.append("Description = %s")
        params.append(update_data.description)
    # Use the alias 'url' from the Pydantic model
    if update_data.image_url is not None:
        updates.append("url = %s")
        params.append(update_data.image_url)

    if not updates:
        logger.info(f"Admin: No update data provided for coach StaffID {staff_id}.")
        # Return current details if no update happened
        return get_coach_details_admin(staff_id, db)

    try:
        with db.cursor() as cursor:
            sql = f"UPDATE Coach SET {', '.join(updates)} WHERE StaffID = %s"
            params.append(staff_id)
            logger.debug(f"Admin: Executing Coach update for StaffID {staff_id}: {sql}")
            cursor.execute(sql, tuple(params))

            if cursor.rowcount == 0:
                 logger.warning(f"Admin: Update for coach StaffID {staff_id} affected 0 rows.")
                 # This might happen in a race condition, but likely indicates an issue.
                 # Return current data as update didn't seem to apply.
                 db.rollback()
                 return get_coach_details_admin(staff_id, db)

            db.commit()
            logger.info(f"Admin: Successfully updated coach StaffID {staff_id}.")

            # Fetch and return updated details
            return get_coach_details_admin(staff_id, db)

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error updating coach StaffID {staff_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during coach update")
    except Exception as e:
        db.rollback()
        logger.exception(f"Admin: Unexpected error updating coach StaffID {staff_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during coach update")