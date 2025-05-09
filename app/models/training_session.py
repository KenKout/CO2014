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
    
def get_training_sessions_by_customer_id(customer_id: int, db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all training sessions a specific customer is enrolled in.
    """
    if customer_id <= 0:
        logger.warning(f"Attempted to fetch training sessions for invalid customer ID: {customer_id}")
        raise HTTPException(status_code=400, detail="Invalid Customer ID provided.")

    try:
        with db.cursor() as cursor:
            sql = """
                SELECT
                    ts.SessionID, ts.StartDate, ts.EndDate, ts.CoachID, ts.CourtID,
                    ts.Schedule, ts.Type, ts.Price, ts.Max_Students, ts.Status, ts.Rating,
                    s.Name as CoachName, c.url as coach_image_url
                FROM Enroll e
                JOIN Training_Session ts ON e.SessionID = ts.SessionID
                JOIN Coach c ON ts.CoachID = c.StaffID
                JOIN Staff s ON c.StaffID = s.StaffID
                WHERE e.CustomerID = %s
                ORDER BY ts.StartDate
            """
            cursor.execute(sql, (customer_id,))
            sessions = cursor.fetchall()
            if not sessions:
                 logger.info(f"No enrolled training sessions found for customer ID {customer_id}.")
            return sessions
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching enrolled training sessions for customer ID {customer_id}: {db_err}")
        # Return generic error to user
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error fetching enrolled training sessions for customer ID {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
# --- Admin Specific Functions ---

def create_training_session_admin(session_data, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Create a new training session.
    session_data is an instance of AdminTrainingSessionCreateRequest Pydantic model.
    SessionID is now AUTO_INCREMENT and generated by the database.
    """
    # Basic validation (more can be added, e.g., check if CoachID/CourtID exist)
    if session_data.EndDate <= session_data.StartDate:
        raise HTTPException(status_code=400, detail="EndDate must be after StartDate")

    try:
        # --- Start Transaction ---
        db.begin()
        with db.cursor() as cursor:
            # SessionID conflict check removed as it's auto-generated.

            # Check if CoachID exists
            cursor.execute("SELECT StaffID FROM Coach WHERE StaffID = %s", (session_data.CoachID,))
            if not cursor.fetchone():
                 raise HTTPException(status_code=404, detail=f"Coach with StaffID {session_data.CoachID} not found.")
            
            # Check if CourtID exists
            cursor.execute("SELECT Court_ID FROM Court WHERE Court_ID = %s", (session_data.CourtID,))
            if not cursor.fetchone():
                 raise HTTPException(status_code=404, detail=f"Court with Court_ID {session_data.CourtID} not found.")

            # Insert new session (SessionID is auto-generated)
            sql = """
            INSERT INTO Training_Session
            (StartDate, EndDate, CoachID, CourtID, Schedule, Type, Status, Price, Rating, Max_Students)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
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
            
            # Get the ID of the newly inserted session
            new_session_id = cursor.lastrowid
            if not new_session_id:
                 logger.error("Failed to retrieve lastrowid after inserting training session.")
                 db.rollback()
                 raise HTTPException(status_code=500, detail="Failed to get new SessionID after creation.")
            
            logger.info(f"Created Training_Session with ID: {new_session_id}")
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
                        new_session_id, # Use the newly generated SessionID
                        session_data.CourtID, # Use the same CourtID as the session
                        slot.StartTime,
                        slot.EndTime
                    ))
                
                if schedule_params:
                    cursor.executemany(schedule_sql, schedule_params)
                    logger.info(f"Inserted {len(schedule_params)} schedule slots for SessionID {new_session_id}")

            # --- Commit Transaction ---
            db.commit()
            logger.info(f"Admin created Training Session ID: {new_session_id} and associated schedule slots.")
            
            # Fetch and return the created session details using the new ID
            return get_training_session_by_id_admin(new_session_id, db)

    except pymysql.err.IntegrityError as e:
        db.rollback()
        logger.error(f"Admin: IntegrityError creating session: {e}") # Removed SessionID from log
        # Could be FK constraint violation (CoachID, CourtID) if checks above fail somehow
        raise HTTPException(status_code=400, detail=f"Database integrity error: {e}")
    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error creating session: {db_err}") # Removed SessionID from log
        raise HTTPException(status_code=500, detail="Database error during session creation")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise 404, 400 (409 removed)
            raise e
        logger.exception(f"Admin: Unexpected error creating session: {e}") # Removed SessionID from log
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


def update_training_session_admin(session_id: int, update_data, db: pymysql.connections.Connection) -> Dict[str, Any]: # Add type hint for update_data
    """
    Admin: Update details for a specific training session.
    update_data is an instance of AdminTrainingSessionUpdateRequest.
    Raises 404 if session not found.
    """
    try:
        current_session = get_training_session_by_id_admin(session_id, db)
    except HTTPException as e:
        raise e # Re-raise 404 or other errors

    # --- Prepare update for main Training_Session table ---
    updates = []
    params = []
    # Create the dict *excluding* schedule_slots initially
    update_dict_main = update_data.model_dump(exclude={'schedule_slots'}, exclude_unset=True)

    field_map = {
        "StartDate": "StartDate", "EndDate": "EndDate", "CoachID": "CoachID",
        "CourtID": "CourtID", "Schedule": "Schedule", "Type": "Type",
        "Status": "Status", "Price": "Price", "Rating": "Rating",
        "Max_Students": "Max_Students"
    }

    for field, value in update_dict_main.items():
        db_column = field_map.get(field)
        if db_column:
            # Handle Enum values
            if field in ["Type", "Status"] and value is not None:
                 # Assuming value is already the correct enum member from Pydantic validation
                 updates.append(f"{db_column} = %s")
                 params.append(value.value) # Use enum value directly
            elif value is not None:
                 updates.append(f"{db_column} = %s")
                 params.append(value)

    if not updates and update_data.schedule_slots is None: # Check if NO fields AND NO slots were provided
        logger.info(f"Admin: No update data provided for session ID {session_id}.")
        # Note: If only schedule_slots are updated, 'updates' will be empty, which is fine.
        # Only return early if *nothing* was sent to update.
        # Check if schedule_slots was explicitly provided (even if empty list)
        if 'schedule_slots' not in update_data.model_dump(exclude_unset=False): # Check if key exists at all
             return current_session

    # Add session_id to params for WHERE clause IF updating the main table
    if updates:
        params.append(session_id)

    try:
        db.begin()
        with db.cursor() as cursor:
            # 1. Handle Schedule Slot Replacement (if provided in the original request)
            # Check the Pydantic model directly, not the dict
            if update_data.schedule_slots is not None:
                new_slots_objects = update_data.schedule_slots # These are ScheduleSlot OBJECTS

                # Delete existing slots
                delete_schedule_sql = "DELETE FROM TrainingSchedule WHERE SessionID = %s"
                cursor.execute(delete_schedule_sql, (session_id,))
                logger.info(f"Deleted existing schedule slots for SessionID {session_id} before update.")

                # Insert new slots if the list is not empty
                if new_slots_objects: # Check if the list has items
                    schedule_sql = """
                    INSERT INTO TrainingSchedule (SessionID, CourtID, StartTime, EndTime)
                    VALUES (%s, %s, %s, %s)
                    """
                    schedule_params = []
                    # Determine effective StartDate, EndDate, CourtID
                    # Use updated values if provided, otherwise use current values
                    # Access the potentially updated values from the Pydantic model or fall back
                    effective_start_date = update_data.StartDate or current_session['StartDate']
                    effective_end_date = update_data.EndDate or current_session['EndDate']
                    effective_court_id = update_data.CourtID or current_session['CourtID']

                    # Iterate over the list of ScheduleSlot OBJECTS
                    for slot_obj in new_slots_objects:
                         # Now access attributes using dot notation - THIS IS THE FIX
                         if not (effective_start_date <= slot_obj.StartTime < slot_obj.EndTime <= effective_end_date):
                             db.rollback() # Rollback before raising
                             raise HTTPException(
                                 status_code=400,
                                 detail=f"New schedule slot {slot_obj.StartTime}-{slot_obj.EndTime} is outside the effective session bounds {effective_start_date}-{effective_end_date}."
                             )
                         schedule_params.append((
                            session_id,
                            effective_court_id,
                            slot_obj.StartTime, # Use attribute access
                            slot_obj.EndTime   # Use attribute access
                         ))

                    if schedule_params:
                        cursor.executemany(schedule_sql, schedule_params)
                        logger.info(f"Inserted {len(schedule_params)} new schedule slots for SessionID {session_id}")

            # 2. Update Training_Session table (if other fields were provided)
            if updates: # Only run update if there are fields for the main table
                 # Optional: Add checks for new CoachID/CourtID existence
                 if 'CoachID' in update_dict_main and update_dict_main['CoachID'] is not None:
                    cursor.execute("SELECT StaffID FROM Coach WHERE StaffID = %s", (update_dict_main['CoachID'],))
                    if not cursor.fetchone():
                        db.rollback()
                        raise HTTPException(status_code=404, detail=f"New Coach with StaffID {update_dict_main['CoachID']} not found.")
                 if 'CourtID' in update_dict_main and update_dict_main['CourtID'] is not None:
                    cursor.execute("SELECT Court_ID FROM Court WHERE Court_ID = %s", (update_dict_main['CourtID'],))
                    if not cursor.fetchone():
                        db.rollback()
                        raise HTTPException(status_code=404, detail=f"New Court with Court_ID {update_dict_main['CourtID']} not found.")

                 # Execute update for Training_Session
                 sql = f"UPDATE Training_Session SET {', '.join(updates)} WHERE SessionID = %s"
                 logger.debug(f"Admin: Executing Session update for ID {session_id}: {sql} with params {params}")
                 cursor.execute(sql, tuple(params)) # params already includes session_id if updates exist

                 # Don't warn about rowcount 0 if only schedule slots were potentially updated
                 # Check rowcount only if 'updates' list was non-empty
                 if cursor.rowcount == 0:
                      logger.warning(f"Admin: Update for session ID {session_id} (main table) affected 0 rows unexpectedly.")
                      # Consider if this should be an error or just a warning

                 logger.info(f"Admin: Successfully updated main details for session ID {session_id}.")

            # --- Commit Transaction ---
            db.commit()
            logger.info(f"Admin: Update transaction committed for session ID {session_id}.")

            return get_training_session_by_id_admin(session_id, db)

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error updating session ID {session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during session update")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise validation errors
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