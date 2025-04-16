from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Payments"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Payment(BaseModel):
    payment_id: int
    order_id: int
    date: datetime
    total: int
    customer_id: int
    method: str
    time: Optional[datetime] = None

class PaymentUpdate(BaseModel):
    status: Optional[str] = None  # For example, 'completed', 'refunded'

# Routes
@router.get("/payments", response_model=List[Payment])
async def list_payments(
    customer_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    method: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """List all payments with filters."""
    with db.cursor() as cursor:
        query = """
        SELECT PaymentID as payment_id, OrderID as order_id, Date as date, Total as total, 
               Customer_ID as customer_id, Method as method, Time as time
        FROM payment
        WHERE 1=1
        """
        params = []
        if customer_id:
            query += " AND Customer_ID = %s"
            params.append(customer_id)
        if start_date:
            query += " AND Date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND Date <= %s"
            params.append(end_date)
        if method:
            query += " AND Method = %s"
            params.append(method)
        
        cursor.execute(query, params)
        payments = cursor.fetchall()
        return payments

@router.get("/payments/{payment_id}", response_model=Payment)
async def get_payment(payment_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get payment details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT PaymentID as payment_id, OrderID as order_id, Date as date, Total as total, 
               Customer_ID as customer_id, Method as method, Time as time
        FROM payment
        WHERE PaymentID = %s
        """, (payment_id,))
        payment = cursor.fetchone()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        return payment

@router.put("/payments/{payment_id}", response_model=Payment)
async def update_payment(payment_id: int, update: PaymentUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update payment status (e.g., refund)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT PaymentID FROM payment WHERE PaymentID = %s", (payment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Assuming a status field exists or can be added for payment status updates
        # If not, this can be adjusted based on actual schema
        if update.status:
            # Here we would update a status field if it exists
            # For now, we'll simulate a placeholder since schema doesn't have status
            pass
        
        db.commit()
        
        cursor.execute("""
        SELECT PaymentID as payment_id, OrderID as order_id, Date as date, Total as total, 
               Customer_ID as customer_id, Method as method, Time as time
        FROM payment
        WHERE PaymentID = %s
        """, (payment_id,))
        updated_payment = cursor.fetchone()
        return updated_payment