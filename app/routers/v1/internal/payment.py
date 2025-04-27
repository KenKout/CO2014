from fastapi import APIRouter, Depends, HTTPException, status, Header, Security
from pydantic import BaseModel, Field
from typing import Optional
import pymysql
from loguru import logger
import secrets # For secure comparison

from app.database import get_db
from app.env import PAYMENT_WEBHOOK_SECRET
from app.models.enums import PaymentStatus, BookingStatus

# --- Security Dependency ---

async def verify_webhook_token(authorization: Optional[str] = Header(None)):
    """Dependency to verify the webhook bearer token."""
    if authorization is None:
        logger.warning("Webhook called without Authorization header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not secrets.compare_digest(token, PAYMENT_WEBHOOK_SECRET):
        logger.warning(f"Webhook called with invalid token. Scheme: {scheme}, Token: {token[:5]}...") # Log first 5 chars only
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # If token is valid, proceed
    logger.info("Webhook authentication successful.")


# --- Router Setup ---

# Use a different prefix for internal/webhook routes
internal_payment_router = APIRouter(
    prefix="/internal/payment",
    tags=["Internal - Payment Webhook"],
    dependencies=[Security(verify_webhook_token)], # Apply security to all routes in this router
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "Not found"},
        400: {"description": "Bad Request"},
        500: {"description": "Internal Server Error"}
    },
)

# --- Pydantic Model for Request Body ---

class PaymentConfirmationRequest(BaseModel):
    description: str = Field(..., description="The unique payment description generated during order creation.")

# --- API Endpoint ---

@internal_payment_router.post("/confirm", status_code=status.HTTP_200_OK)
async def confirm_payment(
    payload: PaymentConfirmationRequest,
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Webhook endpoint to confirm a payment and update related booking statuses.
    Requires Bearer token authentication matching PAYMENT_WEBHOOK_SECRET.
    """
    payment_description = payload.description
    logger.info(f"Received payment confirmation request for description: {payment_description}")

    try:
        with db.cursor() as cursor:
            # --- Find Payment by Description ---
            cursor.execute(
                "SELECT PaymentID, OrderID, Status FROM Payment WHERE Description = %s",
                (payment_description,)
            )
            payment = cursor.fetchone()

            if not payment:
                logger.warning(f"Payment not found for description: {payment_description}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment description not found.")

            payment_id = payment['PaymentID']
            order_id = payment['OrderID']
            current_status = payment['Status']

            if current_status != PaymentStatus.PENDING.value:
                logger.warning(f"Payment {payment_id} (Description: {payment_description}) already has status: {current_status}. No action taken.")
                # Return 200 OK even if already processed to acknowledge receipt
                return {"message": f"Payment already processed with status: {current_status}"}

            # --- Start Transaction ---
            try:
                # --- Update Payment Status ---
                cursor.execute(
                    "UPDATE Payment SET Status = %s WHERE PaymentID = %s",
                    (PaymentStatus.SUCCESS.value, payment_id)
                )
                logger.info(f"Updated Payment {payment_id} status to {PaymentStatus.SUCCESS.value}")

                # --- Update Booking Statuses ---
                # Find all bookings associated with this OrderID that are still Pending
                cursor.execute(
                    "UPDATE Booking SET Status = %s WHERE OrderID = %s AND Status = %s",
                    (BookingStatus.SUCCESS.value, order_id, BookingStatus.PENDING.value)
                )
                updated_bookings_count = cursor.rowcount
                logger.info(f"Updated {updated_bookings_count} Booking(s) status to {BookingStatus.SUCCESS.value} for OrderID {order_id}")

                # --- Commit Transaction ---
                db.commit()
                logger.info(f"Successfully confirmed payment and updated bookings for PaymentID {payment_id}, OrderID {order_id}")
                return {"message": "Payment confirmed successfully and bookings updated."}

            except pymysql.Error as db_err:
                db.rollback()
                logger.error(f"Database error during payment confirmation transaction for PaymentID {payment_id}: {db_err}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error during confirmation.")
            except Exception as e:
                 db.rollback()
                 logger.exception(f"Unexpected error during payment confirmation transaction for PaymentID {payment_id}: {e}")
                 raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during confirmation.")

    except HTTPException as e:
        # Re-raise HTTPExceptions (like 404 Not Found)
        raise e
    except pymysql.Error as db_err:
        # Catch errors during initial payment fetch
        logger.error(f"Database error fetching payment for description {payment_description}: {db_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error finding payment.")
    except Exception as e:
        # Catch any other unexpected errors
        logger.exception(f"Unexpected error processing payment confirmation for description {payment_description}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")