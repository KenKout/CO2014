import pymysql
from fastapi import HTTPException
from loguru import logger
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid # Add uuid for unique payment description
from app.models.enums import PaymentMethod, PaymentStatus # Add Payment enums

def get_enrollment_count(session_id: int, db: pymysql.connections.Connection) -> int:
    """
    Get the current number of enrollments for a specific training session.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM Enroll WHERE SessionID = %s", (session_id,))
            result = cursor.fetchone()
            return result['count'] if result else 0
    except pymysql.Error as db_err:
        logger.error(f"Database error counting enrollments for session ID {session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error counting enrollments for session ID {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

def is_user_enrolled(customer_id: int, session_id: int, db: pymysql.connections.Connection) -> bool:
    """
    Check if a specific customer is already enrolled in a specific training session.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute("SELECT 1 FROM Enroll WHERE CustomerID = %s AND SessionID = %s", (customer_id, session_id))
            return cursor.fetchone() is not None
    except pymysql.Error as db_err:
        logger.error(f"Database error checking enrollment for customer {customer_id}, session {session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error checking enrollment for customer {customer_id}, session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

def enroll_user_in_session(customer_id: int, session_id: int, price: int, payment_method: PaymentMethod, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Enroll a user in a training session by creating an order and an enrollment record.
    Returns a dictionary containing the OrderID, PaymentID, and Payment Description.
    Uses a transaction to ensure atomicity.
    """
    try:
        with db.cursor() as cursor:
            # Start transaction
            db.begin()

            # 1. Create Order in OrderTable
            cursor.execute(
                """
                INSERT INTO OrderTable (OrderDate, TotalAmount, CustomerID, SessionID)
                VALUES (NOW(), %s, %s, %s)
                """,
                (price, customer_id, session_id)
            )
            order_id = cursor.lastrowid
            if not order_id:
                 logger.error(f"Failed to retrieve OrderID after insert for customer {customer_id}, session {session_id}")
                 db.rollback()
                 raise HTTPException(status_code=500, detail="Failed to create order record")

            # 2. Create Payment Entry
            payment_description = str(uuid.uuid4()) # Generate unique description
            cursor.execute(
                """
                INSERT INTO Payment (OrderID, Total, Customer_ID, Method, Status, Description, Time)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """,
                (order_id, price, customer_id, payment_method.value, PaymentStatus.PENDING.value, payment_description)
            )
            payment_id = cursor.lastrowid
            if not payment_id:
                 logger.error(f"Failed to retrieve PaymentID after insert for order {order_id}")
                 db.rollback()
                 raise HTTPException(status_code=500, detail="Failed to create payment record")
            logger.info(f"Created Payment entry with ID: {payment_id} for OrderID: {order_id} with Description: {payment_description}")


            # 3. Create Enrollment in Enroll table
            cursor.execute(
                """
                INSERT INTO Enroll (CustomerID, SessionID)
                VALUES (%s, %s)
                """,
                (customer_id, session_id)
            )

            # Commit transaction
            db.commit()
            logger.info(f"Customer {customer_id} successfully enrolled in session {session_id}. OrderID: {order_id}, PaymentID: {payment_id}")
            return {
                "order_id": order_id,
                "payment_id": payment_id,
                "payment_description": payment_description
            }

    except pymysql.err.IntegrityError as integrity_err:
        db.rollback()
        # Check if it's a duplicate enrollment error
        if integrity_err.args[0] == 1062: # Duplicate entry error code
             logger.warning(f"Attempted duplicate enrollment for customer {customer_id}, session {session_id}")
             raise HTTPException(status_code=409, detail="User already enrolled in this session")
        else:
             logger.error(f"Database integrity error during enrollment for customer {customer_id}, session {session_id}: {integrity_err}")
             raise HTTPException(status_code=500, detail="Database integrity error during enrollment")

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error during enrollment for customer {customer_id}, session {session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during enrollment")
    except Exception as e:
        db.rollback()
        logger.exception(f"Unexpected error during enrollment for customer {customer_id}, session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during enrollment")
    

# --- Admin Specific Functions ---

def get_enrollments_admin(
    db: pymysql.connections.Connection,
    customer_id: Optional[int] = None,
    session_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Admin: Get all enrollments, optionally filtered by customer or session.
    Includes Customer Name and basic Session Info.
    """
    try:
        with db.cursor() as cursor:
            base_sql = """
            SELECT
                e.CustomerID, e.SessionID,
                c.Name as CustomerName,
                ts.Type as SessionType, ts.StartDate as SessionStartDate
            FROM Enroll e
            LEFT JOIN Customer c ON e.CustomerID = c.CustomerID
            LEFT JOIN Training_Session ts ON e.SessionID = ts.SessionID
            """
            
            filters = []
            params = []
            
            if customer_id is not None:
                filters.append("e.CustomerID = %s")
                params.append(customer_id)
            if session_id is not None:
                filters.append("e.SessionID = %s")
                params.append(session_id)

            if filters:
                base_sql += " WHERE " + " AND ".join(filters)
            
            base_sql += " ORDER BY e.CustomerID, e.SessionID" # Order for consistency

            cursor.execute(base_sql, tuple(params))
            enrollments = cursor.fetchall()

            if not enrollments:
                logger.info("Admin: No enrollments found matching the criteria.")
            
            # Format SessionDetails
            for enroll in enrollments:
                    start_date_str = enroll.get("SessionStartDate").isoformat() if isinstance(enroll.get("SessionStartDate"), datetime) else "N/A"
                    enroll["SessionDetails"] = f"{enroll.get('SessionType')} ({start_date_str})"

            logger.info(f"Admin fetched {len(enrollments)} enrollments.")
            return enrollments

    except pymysql.Error as db_err:
        logger.error(f"Admin: Database error fetching enrollments: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching enrollments")
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching enrollments: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


def create_enrollment_admin(customer_id: int, session_id: int, db: pymysql.connections.Connection) -> Dict[str, Any]:
    """
    Admin: Manually create an enrollment record. Does NOT create an order.
    Raises 404 if Customer or Session not found. Raises 409 if already enrolled.
    """
    try:
        with db.cursor() as cursor:
            # Check if Customer exists
            cursor.execute("SELECT CustomerID FROM Customer WHERE CustomerID = %s", (customer_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found.")

            # Check if Session exists
            cursor.execute("SELECT SessionID FROM Training_Session WHERE SessionID = %s", (session_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Training Session with ID {session_id} not found.")

            # Check if already enrolled
            if is_user_enrolled(customer_id, session_id, db):
                    raise HTTPException(status_code=409, detail="Customer already enrolled in this session.")

            # Insert into Enroll table
            sql = "INSERT INTO Enroll (CustomerID, SessionID) VALUES (%s, %s)"
            cursor.execute(sql, (customer_id, session_id))
            db.commit()
            logger.info(f"Admin manually enrolled CustomerID {customer_id} in SessionID {session_id}")

            # Fetch and return the created enrollment details (or just confirm success)
            # Let's return the basic info for confirmation
            return {"CustomerID": customer_id, "SessionID": session_id}
            # Ideally, fetch details like in get_enrollments_admin, but requires another query

    except pymysql.err.IntegrityError as e:
        db.rollback()
        # This might catch FK violations if checks above fail, or duplicate key if is_user_enrolled fails
        logger.error(f"Admin: IntegrityError creating enrollment for C:{customer_id} S:{session_id}: {e}")
        if e.args[0] == 1062: # Duplicate entry
                raise HTTPException(status_code=409, detail="Customer already enrolled in this session.")
        else: # Other integrity error (e.g., FK constraint)
                raise HTTPException(status_code=400, detail=f"Database integrity error: {e}")
    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error creating enrollment for C:{customer_id} S:{session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during enrollment creation")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise 404, 409
            raise e
        logger.exception(f"Admin: Unexpected error creating enrollment for C:{customer_id} S:{session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during enrollment creation")


def delete_enrollment_admin(customer_id: int, session_id: int, db: pymysql.connections.Connection):
    """
    Admin: Manually delete an enrollment record.
    Raises 404 if the enrollment does not exist.
    """
    try:
        with db.cursor() as cursor:
            # Check if enrollment exists before deleting
            if not is_user_enrolled(customer_id, session_id, db):
                    raise HTTPException(status_code=404, detail="Enrollment not found for this customer and session.")

            # Delete from Enroll table
            sql = "DELETE FROM Enroll WHERE CustomerID = %s AND SessionID = %s"
            cursor.execute(sql, (customer_id, session_id))

            if cursor.rowcount == 0:
                    # Should not happen if is_user_enrolled passed, but safety check
                    logger.warning(f"Admin: Delete enrollment for C:{customer_id} S:{session_id} affected 0 rows.")
                    db.rollback()
                    raise HTTPException(status_code=500, detail="Failed to delete enrollment record.")

            db.commit()
            logger.info(f"Admin manually deleted enrollment for CustomerID {customer_id}, SessionID {session_id}")
            # No body needed for 204 response

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Admin: Database error deleting enrollment for C:{customer_id} S:{session_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error during enrollment deletion")
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): # Re-raise 404
            raise e
        logger.exception(f"Admin: Unexpected error deleting enrollment for C:{customer_id} S:{session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during enrollment deletion")