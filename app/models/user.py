import pymysql
from fastapi import HTTPException
from app.database import get_db
from datetime import datetime
from app.models.enums import UserType
from loguru import logger # Import loguru


# Database operations for User model using raw SQL
def get_user_by_username(username: str, db: pymysql.connections.Connection):
    """
    Fetch a user by username from the database.
    """
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM User WHERE Username = %s", (username,))
        return cursor.fetchone()

def register_user(username: str, hashed_password: str, phone: str, user_type: str, name: str, db: pymysql.connections.Connection):
    """
    Register a new user and associated customer/staff data.
    Validates user_type against UserType enum to ensure consistency.
    """
    try:
        # Validate user_type against UserType enum values
        try:
            user_type_enum = UserType(user_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user type provided. Must be 'Customer' or 'Staff'.")
            
        with db.cursor() as cursor:
            # Insert into User table
            cursor.execute(
                "INSERT INTO User (Username, Password, Phone, UserType, JoinDate) VALUES (%s, %s, %s, %s, NOW())",
                (username, hashed_password, phone, user_type)
            )
            
            # If user_type is Customer, insert into Customer table
            if user_type_enum == UserType.CUSTOMER:
                cursor.execute(
                    "INSERT INTO Customer (Name, Username, Date_of_Birth) VALUES (%s, %s, NOW())",
                    (name, username)
                )
            db.commit()
        return {"message": "User registered successfully"}
    except pymysql.err.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already registered")


# --- Admin Specific Functions ---

def create_user_admin(db: pymysql.connections.Connection, user_data, hashed_password: str):
    """
    Admin function to create a new user (Customer or Staff) and associated details.
    Handles transaction management.
    """
    # user_data is expected to be an instance of AdminUserCreateRequest Pydantic model
    username = user_data.username
    phone = user_data.phone
    user_type = user_data.user_type.value # Get the string value from Enum
    name = user_data.name
    join_date = datetime.now() # Use current time for JoinDate

    try:
        with db.cursor() as cursor:
            # 1. Insert into User table
            logger.debug(f"Inserting user '{username}' into User table.")
            cursor.execute(
                """
                INSERT INTO User (Username, Password, Phone, UserType, JoinDate)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (username, hashed_password, phone, user_type, join_date)
            )

            # 2. Insert into Customer or Staff table
            if user_data.user_type == UserType.CUSTOMER:
                logger.debug(f"Inserting customer details for '{username}'.")
                # Ensure date_of_birth is provided (validated by Pydantic)
                if not user_data.date_of_birth:
                     # This should ideally be caught by Pydantic, but double-check
                     raise ValueError("Date of Birth is required for Customer type.")
                cursor.execute(
                    """
                    INSERT INTO Customer (Name, Date_of_Birth, Username)
                    VALUES (%s, %s, %s)
                    """,
                    (name, user_data.date_of_birth, username)
                )
                # Fetch CustomerID if needed later, though not strictly required for response here
                # customer_id = cursor.lastrowid
            elif user_data.user_type == UserType.STAFF:
                logger.debug(f"Inserting staff details for '{username}'.")
                 # Ensure salary is provided (validated by Pydantic)
                if user_data.salary is None:
                    # This should ideally be caught by Pydantic, but double-check
                    raise ValueError("Salary is required for Staff type.")
                cursor.execute(
                    """
                    INSERT INTO Staff (Username, Name, Salary)
                    VALUES (%s, %s, %s)
                    """,
                    (username, name, user_data.salary)
                )
                # Fetch StaffID if needed later
                # staff_id = cursor.lastrowid
            else:
                # Should not happen if UserType enum is used correctly
                raise ValueError(f"Invalid user type encountered: {user_type}")

            # 3. Commit transaction
            db.commit()
            logger.info(f"Successfully created user '{username}' as {user_type}.")

            # 4. Fetch and return created user details (simplified for now)
            # Ideally, fetch the full details matching UserResponse structure
            # For now, return basic info confirming creation
            return {
                "Username": username,
                "Phone": phone,
                "UserType": user_data.user_type, # Return the Enum member
                "JoinDate": join_date.isoformat(), # Format datetime as string
                "message": "User created successfully" # Add a success message
            }

    except pymysql.err.IntegrityError as e:
        db.rollback()
        logger.error(f"IntegrityError creating user '{username}': {e}. Username likely exists.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already registered")
    except ValueError as ve: # Catch validation errors missed by Pydantic or internal logic
        db.rollback()
        logger.error(f"ValueError creating user '{username}': {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        logger.exception(f"Unexpected error creating user '{username}': {e}")
        # Keep detail generic for production
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error during user creation")


def get_all_users_admin(db: pymysql.connections.Connection, page: int = 1, limit: int = 25):
    """
    Admin function to fetch all users with their associated Customer or Staff details.
    """
    try:
        with db.cursor() as cursor:
            # Calculate OFFSET
            offset = (page - 1) * limit

            # Use LEFT JOIN to get details from Customer or Staff based on UserType
            # Select base User info and conditional Customer/Staff info
            sql = """
            SELECT
                u.Username, u.Phone, u.UserType, u.JoinDate,
                c.CustomerID, c.Name AS CustomerName, c.Date_of_Birth,
                s.StaffID, s.Name AS StaffName, s.Salary
            FROM User u
            LEFT JOIN Customer c ON u.Username = c.Username AND u.UserType = 'Customer'
            LEFT JOIN Staff s ON u.Username = s.Username AND u.UserType = 'Staff'
            ORDER BY u.JoinDate DESC
            LIMIT %s OFFSET %s
            """
            cursor.execute(sql, (limit, offset))
            users_raw = cursor.fetchall()

            # Process the raw data to structure it nicely
            users_processed = []
            for user_row in users_raw:
                user_detail = {
                    "Username": user_row["Username"],
                    "Phone": user_row["Phone"],
                    "UserType": user_row["UserType"],
                    # Format JoinDate if it's a datetime object
                    "JoinDate": user_row["JoinDate"].isoformat() if isinstance(user_row["JoinDate"], datetime) else user_row["JoinDate"],
                    "details": None # Initialize details as None
                }
                if user_row["UserType"] == UserType.CUSTOMER.value:
                    user_detail["details"] = {
                        "CustomerID": user_row["CustomerID"],
                        "Name": user_row["CustomerName"],
                        # Format Date_of_Birth if it's a datetime object
                        "Date_of_Birth": user_row["Date_of_Birth"].isoformat() if isinstance(user_row["Date_of_Birth"], datetime) else user_row["Date_of_Birth"]
                    }
                elif user_row["UserType"] == UserType.STAFF.value:
                     user_detail["details"] = {
                        "StaffID": user_row["StaffID"],
                        "Name": user_row["StaffName"],
                        "Salary": user_row["Salary"]
                    }
                users_processed.append(user_detail)
            
            logger.info(f"Fetched {len(users_processed)} users for admin view (Page: {page}, Limit: {limit}).")
            return users_processed

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching all users for admin: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching users")
    except Exception as e:
        logger.exception(f"Unexpected error fetching all users for admin: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching users")


def get_user_details_admin(username: str, db: pymysql.connections.Connection):
    """
    Admin function to fetch details for a specific user by username,
    including associated Customer or Staff information.
    Raises 404 if user not found.
    """
    try:
        with db.cursor() as cursor:
            # Fetch user details using the same JOIN logic as get_all_users_admin
            sql = """
            SELECT
                u.Username, u.Phone, u.UserType, u.JoinDate,
                c.CustomerID, c.Name AS CustomerName, c.Date_of_Birth,
                s.StaffID, s.Name AS StaffName, s.Salary
            FROM User u
            LEFT JOIN Customer c ON u.Username = c.Username AND u.UserType = 'Customer'
            LEFT JOIN Staff s ON u.Username = s.Username AND u.UserType = 'Staff'
            WHERE u.Username = %s
            """
            cursor.execute(sql, (username,))
            user_row = cursor.fetchone()

            if not user_row:
                logger.warning(f"Admin requested details for non-existent user: {username}")
                raise HTTPException(status_code=404, detail=f"User '{username}' not found")

            # Process the raw data (similar to get_all_users_admin)
            user_detail = {
                "Username": user_row["Username"],
                "Phone": user_row["Phone"],
                "UserType": user_row["UserType"],
                "JoinDate": user_row["JoinDate"].isoformat() if isinstance(user_row["JoinDate"], datetime) else user_row["JoinDate"],
                "details": None
            }
            if user_row["UserType"] == UserType.CUSTOMER.value:
                user_detail["details"] = {
                    "CustomerID": user_row["CustomerID"],
                    "Name": user_row["CustomerName"],
                    "Date_of_Birth": user_row["Date_of_Birth"].isoformat() if isinstance(user_row["Date_of_Birth"], datetime) else user_row["Date_of_Birth"]
                }
            elif user_row["UserType"] == UserType.STAFF.value:
                 user_detail["details"] = {
                    "StaffID": user_row["StaffID"],
                    "Name": user_row["StaffName"],
                    "Salary": user_row["Salary"]
                }
            
            logger.info(f"Fetched details for user '{username}' for admin view.")
            return user_detail

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching details for user '{username}': {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching user details")
    except Exception as e:
        logger.exception(f"Unexpected error fetching details for user '{username}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching user details")


def update_user_admin(username: str, db: pymysql.connections.Connection, update_data):
    """
    Admin function to update user details (Phone in User table, Name/DOB in Customer, Name/Salary in Staff).
    Handles transaction management. update_data is a Pydantic model instance.
    """
    try:
        with db.cursor() as cursor:
            # 1. Check if user exists and get current UserType
            cursor.execute("SELECT UserType FROM User WHERE Username = %s", (username,))
            user = cursor.fetchone()
            if not user:
                logger.warning(f"Attempt to update non-existent user: {username}")
                raise HTTPException(status_code=404, detail=f"User '{username}' not found")
            
            current_user_type = user['UserType']
            logger.info(f"Attempting to update user '{username}' (Type: {current_user_type})")

            # --- Build Update Statements Dynamically ---
            # User table update (only Phone for now)
            user_updates = []
            user_params = []
            if update_data.phone is not None:
                user_updates.append("Phone = %s")
                user_params.append(update_data.phone)

            # Customer/Staff table updates
            detail_updates = []
            detail_params = []
            target_table = None

            if current_user_type == UserType.CUSTOMER.value:
                target_table = "Customer"
                if update_data.name is not None:
                    detail_updates.append("Name = %s")
                    detail_params.append(update_data.name)
                if update_data.date_of_birth is not None:
                    detail_updates.append("Date_of_Birth = %s")
                    detail_params.append(update_data.date_of_birth)
            elif current_user_type == UserType.STAFF.value:
                target_table = "Staff"
                if update_data.name is not None:
                    detail_updates.append("Name = %s")
                    detail_params.append(update_data.name)
                if update_data.salary is not None:
                    detail_updates.append("Salary = %s")
                    detail_params.append(update_data.salary)

            # --- Execute Updates ---
            updated = False
            # Update User table if needed
            if user_updates:
                user_sql = f"UPDATE User SET {', '.join(user_updates)} WHERE Username = %s"
                user_params.append(username)
                logger.debug(f"Executing User update for '{username}': {user_sql} with params {user_params}")
                cursor.execute(user_sql, tuple(user_params))
                updated = True

            # Update Customer/Staff table if needed
            if detail_updates and target_table:
                detail_sql = f"UPDATE {target_table} SET {', '.join(detail_updates)} WHERE Username = %s"
                detail_params.append(username)
                logger.debug(f"Executing {target_table} update for '{username}': {detail_sql} with params {detail_params}")
                cursor.execute(detail_sql, tuple(detail_params))
                updated = True

            if not updated:
                 logger.info(f"No update performed for user '{username}' as no relevant data was provided.")
                 # Return current details if no update happened? Or raise 400?
                 # For now, let's fetch and return current details.

            # Commit changes
            db.commit()
            logger.info(f"Successfully updated user '{username}'.")

            # Fetch and return updated details
            return get_user_details_admin(username, db) # Reuse existing function

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error updating user '{username}': {db_err}")
        raise HTTPException(status_code=500, detail="Database error during user update")
    except Exception as e:
        db.rollback()
        logger.exception(f"Unexpected error updating user '{username}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error during user update")


def delete_user_admin(username: str, db: pymysql.connections.Connection):
    """
    Admin function to delete a user and their associated Customer/Staff record.
    Handles transaction management. Raises 404 if user not found.
    WARNING: This performs a hard delete. Foreign key constraints in other tables
             (Booking, OrderTable, Coach, Enroll, Payment, FeedBack) might prevent
             deletion if the user is referenced there and ON DELETE CASCADE is not set.
    """
    try:
        with db.cursor() as cursor:
            # 1. Check if user exists and get UserType
            cursor.execute("SELECT UserType FROM User WHERE Username = %s", (username,))
            user = cursor.fetchone()
            if not user:
                logger.warning(f"Attempt to delete non-existent user: {username}")
                raise HTTPException(status_code=404, detail=f"User '{username}' not found")
            
            current_user_type = user['UserType']
            logger.info(f"Attempting to delete user '{username}' (Type: {current_user_type})")

            # 2. Delete from Customer or Staff table first
            target_table = None
            if current_user_type == UserType.CUSTOMER.value:
                target_table = "Customer"
            elif current_user_type == UserType.STAFF.value:
                target_table = "Staff"
                # Additionally, check if the staff is a coach and delete from Coach table
                cursor.execute("SELECT StaffID FROM Staff WHERE Username = %s", (username,))
                staff_info = cursor.fetchone()
                if staff_info:
                    staff_id = staff_info['StaffID']
                    # Check if exists in Coach table before attempting delete
                    cursor.execute("SELECT StaffID FROM Coach WHERE StaffID = %s", (staff_id,))
                    is_coach = cursor.fetchone()
                    if is_coach:
                        logger.debug(f"Deleting coach record for StaffID {staff_id} (User: {username})")
                        cursor.execute("DELETE FROM Coach WHERE StaffID = %s", (staff_id,))


            if target_table:
                logger.debug(f"Deleting from {target_table} for user '{username}'")
                cursor.execute(f"DELETE FROM {target_table} WHERE Username = %s", (username,))

            # 3. Delete from User table
            logger.debug(f"Deleting from User table for user '{username}'")
            cursor.execute("DELETE FROM User WHERE Username = %s", (username,))
            
            # Check if deletion was successful (at least one row affected in User table)
            if cursor.rowcount == 0:
                 # Should not happen if user was found initially, but good safety check
                 logger.error(f"Failed to delete user '{username}' from User table despite initial check.")
                 db.rollback() # Rollback any partial deletes (like Customer/Staff)
                 raise HTTPException(status_code=500, detail="Failed to delete user record.")

            # 4. Commit transaction
            db.commit()
            logger.info(f"Successfully deleted user '{username}'.")
            return {"message": f"User '{username}' deleted successfully."}

    except pymysql.err.IntegrityError as e:
        db.rollback()
        logger.error(f"IntegrityError deleting user '{username}': {e}. User likely referenced in other tables.")
        # Provide a more specific error message about potential dependencies
        raise HTTPException(
            status_code=409, # Conflict
            detail=f"Cannot delete user '{username}'. They might be referenced in bookings, orders, sessions, etc. Error: {e}"
        )
    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error deleting user '{username}': {db_err}")
        raise HTTPException(status_code=500, detail="Database error during user deletion")
    except Exception as e:
        db.rollback()
        logger.exception(f"Unexpected error deleting user '{username}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error during user deletion")


def promote_customer_to_staff_admin(username: str, db: pymysql.connections.Connection, salary: int):
    """
    Admin function to promote a Customer user to Staff.
    Requires the new salary for the staff member.
    Handles transaction management.
    """
    try:
        with db.cursor() as cursor:
            # 1. Check if user exists and is currently a Customer
            cursor.execute("SELECT UserType FROM User WHERE Username = %s", (username,))
            user = cursor.fetchone()
            if not user:
                logger.warning(f"Attempt to promote non-existent user: {username}")
                raise HTTPException(status_code=404, detail=f"User '{username}' not found")
            
            if user['UserType'] != UserType.CUSTOMER.value:
                logger.warning(f"Attempt to promote non-customer user '{username}' to staff. Current type: {user['UserType']}")
                raise HTTPException(status_code=400, detail=f"User '{username}' is not a Customer and cannot be promoted to Staff.")

            # 2. Get Customer details (specifically Name) before deleting
            cursor.execute("SELECT Name FROM Customer WHERE Username = %s", (username,))
            customer_details = cursor.fetchone()
            if not customer_details:
                 # This indicates data inconsistency if the UserType was Customer
                 logger.error(f"Data inconsistency: User '{username}' is Customer type but no record found in Customer table.")
                 raise HTTPException(status_code=500, detail="Data inconsistency found for user.")
            customer_name = customer_details['Name']

            logger.info(f"Attempting to promote user '{username}' from Customer to Staff with salary {salary}")

            # --- Perform Promotion within Transaction ---
            # 3. Delete from Customer table
            logger.debug(f"Deleting customer record for '{username}'")
            cursor.execute("DELETE FROM Customer WHERE Username = %s", (username,))
            if cursor.rowcount == 0:
                # Should not happen if previous checks passed
                raise HTTPException(status_code=500, detail="Failed to delete customer record during promotion.")

            # 4. Insert into Staff table
            logger.debug(f"Inserting staff record for '{username}'")
            cursor.execute(
                "INSERT INTO Staff (Username, Name, Salary) VALUES (%s, %s, %s)",
                (username, customer_name, salary)
            )

            # 5. Update User table UserType
            logger.debug(f"Updating UserType to Staff for '{username}'")
            cursor.execute(
                "UPDATE User SET UserType = %s WHERE Username = %s",
                (UserType.STAFF.value, username)
            )
            if cursor.rowcount == 0:
                 # Should not happen if user exists
                 raise HTTPException(status_code=500, detail="Failed to update user type during promotion.")

            # 6. Commit transaction
            db.commit()
            logger.info(f"Successfully promoted user '{username}' to Staff.")

            # 7. Fetch and return updated details
            return get_user_details_admin(username, db)

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error promoting user '{username}' to staff: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during promotion")
    except Exception as e:
        db.rollback()
        # Re-raise HTTPExceptions from checks
        if isinstance(e, HTTPException):
            raise e
        logger.exception(f"Unexpected error promoting user '{username}' to staff: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during promotion")


def promote_staff_to_coach_admin(username: str, db: pymysql.connections.Connection, description: str, image_url: str):
    """
    Admin function to promote a Staff user to Coach by adding an entry in the Coach table.
    Requires coach description and image URL.
    Handles transaction management.
    """
    try:
        with db.cursor() as cursor:
            # 1. Check if user exists and is currently Staff
            cursor.execute("SELECT UserType FROM User WHERE Username = %s", (username,))
            user = cursor.fetchone()
            if not user:
                logger.warning(f"Attempt to promote non-existent user '{username}' to coach.")
                raise HTTPException(status_code=404, detail=f"User '{username}' not found")
            
            if user['UserType'] != UserType.STAFF.value:
                logger.warning(f"Attempt to promote non-staff user '{username}' to coach. Current type: {user['UserType']}")
                raise HTTPException(status_code=400, detail=f"User '{username}' is not Staff and cannot be promoted to Coach.")

            # 2. Get StaffID
            cursor.execute("SELECT StaffID FROM Staff WHERE Username = %s", (username,))
            staff_info = cursor.fetchone()
            if not staff_info:
                 # This indicates data inconsistency
                 logger.error(f"Data inconsistency: User '{username}' is Staff type but no record found in Staff table.")
                 raise HTTPException(status_code=500, detail="Data inconsistency found for staff user.")
            staff_id = staff_info['StaffID']

            # 3. Check if already a coach
            cursor.execute("SELECT StaffID FROM Coach WHERE StaffID = %s", (staff_id,))
            is_coach = cursor.fetchone()
            if is_coach:
                logger.warning(f"User '{username}' (StaffID: {staff_id}) is already a coach.")
                raise HTTPException(status_code=409, detail=f"User '{username}' is already a coach.")

            logger.info(f"Attempting to promote Staff user '{username}' (StaffID: {staff_id}) to Coach.")

            # --- Perform Promotion within Transaction ---
            # 4. Insert into Coach table
            logger.debug(f"Inserting coach record for StaffID {staff_id}")
            cursor.execute(
                "INSERT INTO Coach (StaffID, Description, url) VALUES (%s, %s, %s)",
                (staff_id, description, image_url)
            )

            # 5. Commit transaction
            db.commit()
            logger.info(f"Successfully promoted user '{username}' to Coach.")

            # 6. Fetch and return user details (no change in User/Staff table, but confirms success)
            # Consider modifying get_user_details_admin to also fetch coach details if applicable
            user_details = get_user_details_admin(username, db)
            user_details["message"] = f"User '{username}' successfully promoted to Coach." # Add specific message
            return user_details

    except pymysql.err.IntegrityError as e: # Catch potential FK issues if StaffID doesn't exist (shouldn't happen with checks)
        db.rollback()
        logger.error(f"IntegrityError promoting user '{username}' to coach: {e}")
        raise HTTPException(status_code=500, detail=f"Database integrity error during coach promotion: {e}")
    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error promoting user '{username}' to coach: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during coach promotion")
    except Exception as e:
        db.rollback()
        # Re-raise HTTPExceptions from checks
        if isinstance(e, HTTPException):
            raise e
        logger.exception(f"Unexpected error promoting user '{username}' to coach: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during coach promotion")


# --- Staff Specific Admin Functions ---

def get_all_staff_admin(db: pymysql.connections.Connection):
    """
    Admin function to fetch all Staff members with their User details.
    """
    try:
        with db.cursor() as cursor:
            sql = """
            SELECT
                s.StaffID, s.Username, s.Name, s.Salary,
                u.Phone, u.JoinDate
            FROM Staff s
            JOIN User u ON s.Username = u.Username
            WHERE u.UserType = 'Staff'
            ORDER BY s.StaffID ASC
            """
            cursor.execute(sql)
            staff_list = cursor.fetchall()
            
            # Format dates if necessary
            for staff in staff_list:
                if isinstance(staff.get("JoinDate"), datetime):
                    staff["JoinDate"] = staff["JoinDate"].isoformat()

            logger.info(f"Fetched {len(staff_list)} staff members for admin view.")
            return staff_list

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching all staff for admin: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching staff")
    except Exception as e:
        logger.exception(f"Unexpected error fetching all staff for admin: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching staff")

def get_staff_by_id_admin(staff_id: int, db: pymysql.connections.Connection):
    """
    Admin function to fetch a specific Staff member by StaffID with User details.
    Raises 404 if not found.
    """
    try:
        with db.cursor() as cursor:
            sql = """
            SELECT
                s.StaffID, s.Username, s.Name, s.Salary,
                u.Phone, u.JoinDate
            FROM Staff s
            JOIN User u ON s.Username = u.Username
            WHERE s.StaffID = %s AND u.UserType = 'Staff'
            """
            cursor.execute(sql, (staff_id,))
            staff = cursor.fetchone()

            if not staff:
                logger.warning(f"Admin requested details for non-existent StaffID: {staff_id}")
                raise HTTPException(status_code=404, detail=f"Staff member with ID {staff_id} not found")

            # Format date if necessary
            if isinstance(staff.get("JoinDate"), datetime):
                staff["JoinDate"] = staff["JoinDate"].isoformat()

            logger.info(f"Fetched details for StaffID {staff_id} for admin view.")
            return staff

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching StaffID {staff_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching staff details")
    except Exception as e:
        logger.exception(f"Unexpected error fetching StaffID {staff_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching staff details")

def update_staff_admin(staff_id: int, db: pymysql.connections.Connection, update_data):
    """
    Admin function to update Staff details (currently only Salary).
    update_data is a Pydantic model instance (StaffUpdateRequest).
    Raises 404 if staff_id not found.
    """
    # Only update salary for now
    if update_data.salary is None:
        logger.info(f"No salary update provided for StaffID {staff_id}.")
        # Fetch and return current data if nothing to update
        return get_staff_by_id_admin(staff_id, db)

    try:
        with db.cursor() as cursor:
            # 1. Check if staff exists
            cursor.execute("SELECT StaffID FROM Staff WHERE StaffID = %s", (staff_id,))
            staff = cursor.fetchone()
            if not staff:
                logger.warning(f"Attempt to update non-existent StaffID: {staff_id}")
                raise HTTPException(status_code=404, detail=f"Staff member with ID {staff_id} not found")

            # 2. Update Salary in Staff table
            sql = "UPDATE Staff SET Salary = %s WHERE StaffID = %s"
            logger.debug(f"Executing Staff update for StaffID {staff_id}: {sql}")
            cursor.execute(sql, (update_data.salary, staff_id))

            if cursor.rowcount == 0:
                 # Should not happen if staff was found, but safety check
                 logger.warning(f"Update for StaffID {staff_id} affected 0 rows.")
                 # Rollback not strictly needed for single update, but good practice
                 db.rollback()
                 # Return current data as update didn't apply?
                 # Or raise 500? Let's return current data for now.
                 return get_staff_by_id_admin(staff_id, db)


            # 3. Commit changes
            db.commit()
            logger.info(f"Successfully updated salary for StaffID {staff_id}.")

            # 4. Fetch and return updated details
            return get_staff_by_id_admin(staff_id, db)

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error updating StaffID {staff_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during staff update")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise 404
            raise e
        logger.exception(f"Unexpected error updating StaffID {staff_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during staff update")


def get_customer_id_by_username(username: str, db: pymysql.connections.Connection) -> int:
    """
    Fetch the CustomerID for a given username. Raises HTTPException on error or if not found.
    """
    result = None # Initialize result to None
    try:
        with db.cursor() as cursor:
            cursor.execute("SELECT CustomerID FROM Customer WHERE Username = %s", (username,))
            result = cursor.fetchone()
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching customer ID for {username}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error fetching customer ID for {username}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    # Check if customer was found *after* the try-except block
    if not result:
        logger.warning(f"Customer not found for username: {username}")
        raise HTTPException(status_code=404, detail="Customer not found")

    return result['CustomerID']

def get_customer_count_admin(db: pymysql.connections.Connection):
    """
    Admin function to get the total number of customers using the GetCustomerCount() SQL function.
    """
    try:
        with db.cursor() as cursor:
            # Call the SQL function
            cursor.execute("SELECT GetCustomerCount() AS count")
            result = cursor.fetchone()
            
            if result is None:
                logger.error("Failed to retrieve customer count")
                raise HTTPException(status_code=500, detail="Failed to retrieve customer count")
                
            logger.info(f"Retrieved customer count: {result['count']}")
            return {"count": result["count"]}
    
    except pymysql.Error as db_err:
        logger.error(f"Database error getting customer count: {db_err}")
        raise HTTPException(status_code=500, detail="Database error retrieving customer count")
    except Exception as e:
        logger.exception(f"Unexpected error getting customer count: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving customer count")
