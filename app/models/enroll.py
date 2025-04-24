import pymysql
from fastapi import HTTPException
from loguru import logger
from datetime import datetime

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

def enroll_user_in_session(customer_id: int, session_id: int, price: int, db: pymysql.connections.Connection) -> int:
    """
    Enroll a user in a training session by creating an order and an enrollment record.
    Returns the OrderID.
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

            # 2. Create Enrollment in Enroll table
            cursor.execute(
                """
                INSERT INTO Enroll (CustomerID, SessionID)
                VALUES (%s, %s)
                """,
                (customer_id, session_id)
            )

            # Commit transaction
            db.commit()
            logger.info(f"Customer {customer_id} successfully enrolled in session {session_id}. OrderID: {order_id}")
            return order_id

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