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
    
    
# --- Admin Specific Functions ---

def create_training_session_admin(session_data, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Create a new training session.
    session_data is an instance of AdminTrainingSessionCreateRequest Pydantic model.
        Requires SessionID to be provided as it's the PK and not auto-incrementing in dump.sql.
        """
    # Check if SessionID is provided
    if session_data.SessionID is None:
         raise HTTPException(status_code=400, detail="SessionID must be provided for creating a training session.")

    # Basic validation (more can be added, e.g., check if CoachID/CourtID exist)
    if session_data.EndDate <= session_data.StartDate:
        raise HTTPException(status_code=400, detail="EndDate must be after StartDate")

    try:
        # --- Start Transaction ---
        db.begin()
        with db.cursor() as cursor:
            # Check for potential SessionID conflict
            cursor.execute("SELECT SessionID FROM Training_Session WHERE SessionID = %s", (session_data.SessionID,))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail=f"SessionID {session_data.SessionID} already exists.")

            # Check if CoachID exists
            cursor.execute("SELECT StaffID FROM Coach WHERE StaffID = %s", (session_data.CoachID,))
            if not cursor.fetchone():
                 raise HTTPException(status_code=404, detail=f"Coach with StaffID {session_data.CoachID} not found.")
            
            # Check if CourtID exists
            cursor.execute("SELECT Court_ID FROM Court WHERE Court_ID = %s", (session_data.CourtID,))
            if not cursor.fetchone():
                 raise HTTPException(status_code=404, detail=f"Court with Court_ID {session_data.CourtID} not found.")

            # Insert new session
            sql = """
            INSERT INTO Training_Session
            (SessionID, StartDate, EndDate, CoachID, CourtID, Schedule, Type, Status, Price, Rating, Max_Students)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                session_data.SessionID,
                session_data.StartDate,
                session_data.EndDate,
                session_data.CoachID,
                session_data.CourtID,
                session_data.Schedule,
                session_data.Type.value,
                session_data.Status.value,
                session_data.Price,
                session_data.Rating,
                session_data.Max_Students
            )
            cursor.execute(sql, params)
            # Don't commit yet, wait until schedules are inserted

            # 2. Insert into TrainingSchedule if slots are provided
            if session_data.schedule_slots:
                schedule_sql = """
                INSERT INTO TrainingSchedule (SessionID, CourtID, StartTime, EndTime)
                VALUES (%s, %s, %s, %s)
                """
                schedule_params = []
                for slot in session_data.schedule_slots:
                    # Validate slot times against session StartDate/EndDate? Optional.
                    if not (session_data.StartDate <= slot.StartTime < slot.EndTime <= session_data.EndDate):
                         raise HTTPException(
                             status_code=400,
                             detail=f"Schedule slot {slot.StartTime}-{slot.EndTime} is outside the session bounds {session_data.StartDate}-{session_data.EndDate}."
                         )
                    schedule_params.append((
                        session_data.SessionID,
                        session_data.CourtID, # Use the same CourtID as the session
                        slot.StartTime,
                        slot.EndTime
                    ))
                
                if schedule_params:
                    cursor.executemany(schedule_sql, schedule_params)
                    logger.info(f"Inserted {len(schedule_params)} schedule slots for SessionID {session_data.SessionID}")

            # --- Commit Transaction ---
            db.commit()
            logger.info(f"Admin created Training Session ID: {session_data.SessionID} and associated schedule slots.")
            
            # Fetch and return the created session details (doesn't include schedule slots yet)
            return get_training_session_by_id_admin(session_data.SessionID, db)

    except pymysql.err.IntegrityError as e:
        db.rollback()
        logger.error(f"Admin: IntegrityError creating session {session_data.SessionID}: {e}")
        # Could be FK constraint violation (CoachID, CourtID) if checks above fail somehow
        raise HTTPException(status_code=400, detail=f"Database integrity error: {e}")
    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error creating session {session_data.SessionID}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during session creation")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise 409, 404, 400
            raise e
        logger.exception(f"Admin: Unexpected error creating session {session_data.SessionID}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during session creation")


# Adapt existing functions for Admin context if needed (e.g., different joins/logging)
# For now, let's reuse/adapt the names slightly for clarity in the router

def get_all_training_sessions_admin(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Admin: Get all training sessions with Coach and Court details.
        """
    try:
        with db.cursor() as cursor:
            # Join with Coach, Staff, and Court
            sql = """
            SELECT
                ts.SessionID, ts.StartDate, ts.EndDate, ts.CoachID, ts.CourtID,
                ts.Schedule, ts.Type, ts.Price, ts.Max_Students, ts.Status, ts.Rating,
                s.Name as CoachName,
                co.url as coach_image_url,
                ct.Type as CourtType, ct.Status as CourtStatus, ct.HourRate as CourtHourRate
            FROM Training_Session ts
            LEFT JOIN Coach co ON ts.CoachID = co.StaffID
            LEFT JOIN Staff s ON co.StaffID = s.StaffID
            LEFT JOIN Court ct ON ts.CourtID = ct.Court_ID
            ORDER BY ts.StartDate DESC
            """
            cursor.execute(sql)
            sessions = cursor.fetchall()
            if not sessions:
                logger.info("Admin: No training sessions found.")
            
            # Combine court info and fetch schedule slots
            session_ids = [s['SessionID'] for s in sessions if s.get('SessionID')]
            schedule_slots_map = {}
            if session_ids:
                # Fetch all relevant schedule slots in one query
                schedule_sql = "SELECT SessionID, StartTime, EndTime FROM TrainingSchedule WHERE SessionID IN %s ORDER BY StartTime"
                cursor.execute(schedule_sql, (session_ids,))
                all_slots = cursor.fetchall()
                # Group slots by SessionID
                for slot in all_slots:
                    sid = slot['SessionID']
                    if sid not in schedule_slots_map:
                        schedule_slots_map[sid] = []
                    schedule_slots_map[sid].append({
                        "StartTime": slot['StartTime'],
                        "EndTime": slot['EndTime']
                    })

            # Attach court info and schedule slots to each session
            for session in sessions:
                 session["CourtInfo"] = f"Court {session.get('CourtID')} ({session.get('CourtType')})"
                 session["schedule_slots"] = schedule_slots_map.get(session.get('SessionID'), []) # Attach slots or empty list

            return sessions
    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching all training sessions: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching sessions")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching all training sessions: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


def get_training_session_by_id_admin(session_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Get a specific training session by ID with Coach and Court details.
        Raises 404 if not found.
        """
    if session_id <= 0:
        logger.warning(f"Admin: Attempted to fetch training session with invalid ID: {session_id}")
        raise HTTPException(status_code=400, detail="Invalid Session ID provided.")

    session = None
    try:
        with db.cursor() as cursor:
             # Join with Coach, Staff, and Court
            sql = """
            SELECT
                ts.SessionID, ts.StartDate, ts.EndDate, ts.CoachID, ts.CourtID,
                ts.Schedule, ts.Type, ts.Price, ts.Max_Students, ts.Status, ts.Rating,
                s.Name as CoachName,
                co.url as coach_image_url,
                ct.Type as CourtType, ct.Status as CourtStatus, ct.HourRate as CourtHourRate
            FROM Training_Session ts
            LEFT JOIN Coach co ON ts.CoachID = co.StaffID
            LEFT JOIN Staff s ON co.StaffID = s.StaffID
            LEFT JOIN Court ct ON ts.CourtID = ct.Court_ID
            WHERE ts.SessionID = %s
            """
            cursor.execute(sql, (session_id,))
            session = cursor.fetchone()
    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching session ID {session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching session ID {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    if not session:
        logger.warning(f"Admin: Training session with ID {session_id} not found.")
        raise HTTPException(status_code=404, detail=f"Training session with ID {session_id} not found")

    # Combine court info
    session["CourtInfo"] = f"Court {session.get('CourtID')} ({session.get('CourtType')})"
    
    # Fetch schedule slots for this specific session
    try:
        with db.cursor() as cursor:
            schedule_sql = "SELECT StartTime, EndTime FROM TrainingSchedule WHERE SessionID = %s ORDER BY StartTime"
            cursor.execute(schedule_sql, (session_id,))
            slots = cursor.fetchall()
            session["schedule_slots"] = slots if slots else []
    except pymysql.Error as db_err:
         # Log error but don't fail the whole request just because slots couldn't be fetched
         logger.error(f"Admin: Database error fetching schedule slots for session ID {session_id}: {db_err}")
         session["schedule_slots"] = [] # Return empty list on error
    except Exception as e:
         logger.exception(f"Admin: Unexpected error fetching schedule slots for session ID {session_id}: {e}")
         session["schedule_slots"] = [] # Return empty list on error


    logger.info(f"Admin fetched details for session ID {session_id}, including {len(session.get('schedule_slots', []))} schedule slots.")
    return session


def update_training_session_admin(session_id: int, update_data, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Update details for a specific training session.
        update_data is an instance of AdminTrainingSessionUpdateRequest.
        Raises 404 if session not found.
        """
    # Check if session exists first
    try:
        # Fetch current data to validate against and potentially check FKs later
        current_session = get_training_session_by_id_admin(session_id, db)
    except HTTPException as e:
        raise e # Re-raise 404 or other errors

    updates = []
    params = []
    update_dict = update_data.model_dump(exclude_unset=True)

    # Map Pydantic fields to DB columns and build query
    field_map = {
        "StartDate": "StartDate", "EndDate": "EndDate", "CoachID": "CoachID",
        "CourtID": "CourtID", "Schedule": "Schedule", "Type": "Type",
        "Status": "Status", "Price": "Price", "Rating": "Rating",
        "Max_Students": "Max_Students"
    }

    for field, value in update_dict.items():
        db_column = field_map.get(field)
        if db_column:
            # Handle Enum values
            if field in ["Type", "Status"] and value is not None:
                 updates.append(f"{db_column} = %s")
                 params.append(value.value) # Use enum value
            elif value is not None:
                 updates.append(f"{db_column} = %s")
                 params.append(value)

    if not updates:
        logger.info(f"Admin: No update data provided for session ID {session_id}.")
        return current_session # Return current data if nothing to update

    # Add session_id to params for WHERE clause
    params.append(session_id)

    try:
        # --- Start Transaction ---
        db.begin()
        with db.cursor() as cursor:
            # 1. Handle Schedule Slot Replacement (if provided)
            if 'schedule_slots' in update_dict:
                new_slots = update_dict.pop('schedule_slots') # Remove from dict to avoid processing in main update loop
                
                # Delete existing slots for this session
                delete_schedule_sql = "DELETE FROM TrainingSchedule WHERE SessionID = %s"
                cursor.execute(delete_schedule_sql, (session_id,))
                logger.info(f"Deleted existing schedule slots for SessionID {session_id} before update.")

                # Insert new slots if the list is not empty
                if new_slots: # new_slots could be None or an empty list
                    schedule_sql = """
                    INSERT INTO TrainingSchedule (SessionID, CourtID, StartTime, EndTime)
                    VALUES (%s, %s, %s, %s)
                    """
                    schedule_params = []
                    # Determine the effective StartDate, EndDate, CourtID for validation
                    # Use updated values if provided, otherwise use current values
                    effective_start_date = update_dict.get('StartDate', current_session['StartDate'])
                    effective_end_date = update_dict.get('EndDate', current_session['EndDate'])
                    effective_court_id = update_dict.get('CourtID', current_session['CourtID'])

                    for slot_data in new_slots:
                         # Pydantic should have validated StartTime/EndTime format and order within slot
                         # Validate slot times against session StartDate/EndDate
                         if not (effective_start_date <= slot_data.StartTime < slot_data.EndTime <= effective_end_date):
                             raise HTTPException(
                                 status_code=400,
                                 detail=f"New schedule slot {slot_data.StartTime}-{slot_data.EndTime} is outside the effective session bounds {effective_start_date}-{effective_end_date}."
                             )
                         schedule_params.append((
                            session_id,
                            effective_court_id, # Use the effective CourtID
                            slot_data.StartTime,
                            slot_data.EndTime
                         ))
                    
                    if schedule_params:
                        cursor.executemany(schedule_sql, schedule_params)
                        logger.info(f"Inserted {len(schedule_params)} new schedule slots for SessionID {session_id}")

            # 2. Update Training_Session table (if other fields were provided)
            if updates: # Check if there are updates for the main table
                 # Optional: Add checks for new CoachID/CourtID existence if they are being updated
                 if 'CoachID' in update_dict and update_dict['CoachID'] is not None:
                    cursor.execute("SELECT StaffID FROM Coach WHERE StaffID = %s", (update_dict['CoachID'],))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail=f"New Coach with StaffID {update_dict['CoachID']} not found.")
                 if 'CourtID' in update_dict and update_dict['CourtID'] is not None:
                    cursor.execute("SELECT Court_ID FROM Court WHERE Court_ID = %s", (update_dict['CourtID'],))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail=f"New Court with Court_ID {update_dict['CourtID']} not found.")

                 # Execute update for Training_Session
                 sql = f"UPDATE Training_Session SET {', '.join(updates)} WHERE SessionID = %s"
                 logger.debug(f"Admin: Executing Session update for ID {session_id}: {sql}")
                 cursor.execute(sql, tuple(params)) # params already includes session_id

                 if cursor.rowcount == 0 and 'schedule_slots' not in update_data.model_dump(): # Only warn if no other changes were made
                      # If only schedule_slots were updated, rowcount for main table will be 0, which is okay.
                      # If other fields were updated but rowcount is 0, it's unexpected.
                      logger.warning(f"Admin: Update for session ID {session_id} (main table) affected 0 rows unexpectedly.")
                      # Don't rollback here if schedule slots were potentially modified successfully.

                 logger.info(f"Admin: Successfully updated main details for session ID {session_id}.")
            
            # --- Commit Transaction ---
            db.commit()
            logger.info(f"Admin: Update transaction committed for session ID {session_id}.")

            # Fetch and return updated details (including potentially new slots)
            return get_training_session_by_id_admin(session_id, db)

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error updating session ID {session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during session update")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise 404
            raise e
        logger.exception(f"Admin: Unexpected error updating session ID {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during session update")


def delete_training_session_admin(session_id: int, db: pymysql.connections.Connection):
    """
    Admin: Delete a training session by SessionID.
        Raises 404 if not found. Raises 409 if dependencies exist.
        """
    # Check if session exists first
    try:
        get_training_session_by_id_admin(session_id, db)
    except HTTPException as e:
        raise e # Re-raise 404

    try:
        # --- Start Transaction ---
        db.begin()
        with db.cursor() as cursor:
            # 1. Delete from TrainingSchedule first (FK dependency)
            schedule_delete_sql = "DELETE FROM TrainingSchedule WHERE SessionID = %s"
            cursor.execute(schedule_delete_sql, (session_id,))
            deleted_schedules = cursor.rowcount
            if deleted_schedules > 0:
                logger.info(f"Deleted {deleted_schedules} schedule slots for SessionID {session_id}.")

            # 2. Check other dependencies before deleting Training_Session
            # Check Enroll table
                cursor.execute("SELECT CustomerID FROM Enroll WHERE SessionID = %s LIMIT 1", (session_id,))
                if cursor.fetchone():
                    raise HTTPException(status_code=409, detail=f"Cannot delete session {session_id}: Enrollments exist.")
                
                # Check OrderTable table
                cursor.execute("SELECT OrderID FROM OrderTable WHERE SessionID = %s LIMIT 1", (session_id,))
                if cursor.fetchone():
                    raise HTTPException(status_code=409, detail=f"Cannot delete session {session_id}: Orders exist.")

                # Check FeedBack table
                cursor.execute("SELECT FeedbackID FROM FeedBack WHERE SessionID = %s LIMIT 1", (session_id,))
                if cursor.fetchone():
                    raise HTTPException(status_code=409, detail=f"Cannot delete session {session_id}: Feedback exists.")
                    
                # Check TrainingSchedule table (if used)
                cursor.execute("SELECT SessionID FROM TrainingSchedule WHERE SessionID = %s LIMIT 1", (session_id,))
                if cursor.fetchone():
                    # This check might be redundant now as we delete from TrainingSchedule first,
                    # but keep it as a safeguard or if direct manipulation occurs.
                    # cursor.execute("SELECT SessionID FROM TrainingSchedule WHERE SessionID = %s LIMIT 1", (session_id,))
                    # if cursor.fetchone():
                    #     raise HTTPException(status_code=409, detail=f"Cannot delete session {session_id}: Training schedules exist.")
                    pass # Already deleted above

                # 3. Proceed with deleting the main session record
                sql = "DELETE FROM Training_Session WHERE SessionID = %s"
                logger.debug(f"Admin: Executing Session delete for ID {session_id}: {sql}")
                cursor.execute(sql, (session_id,))

                if cursor.rowcount == 0:
                     logger.warning(f"Admin: Delete for session ID {session_id} affected 0 rows.")
                     db.rollback()
                     # Should have been caught by initial check, but raise 500 just in case
                     raise HTTPException(status_code=500, detail="Failed to delete session record.")

                # --- Commit Transaction ---
                db.commit()
                logger.info(f"Admin: Successfully deleted session ID {session_id} and associated schedule slots.")
                # No body needed for 204 response in the router

    except pymysql.Error as db_err: # Catch any other DB errors
            db.rollback()
            logger.error(f"Admin: Database error deleting session ID {session_id}: {db_err}")
            raise HTTPException(status_code=500, detail="Database error during session deletion")
    except Exception as e:
            db.rollback()
            if isinstance(e, HTTPException): # Re-raise 409
                raise e
            logger.exception(f"Admin: Unexpected error deleting session ID {session_id}: {e}")
            raise HTTPException(status_code=500, detail="Internal server error during session deletion")