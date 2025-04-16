from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Training"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class TrainingSession(BaseModel):
    session_id: int
    type: str
    price: Optional[int] = None
    schedule: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    coach_id: Optional[int] = None

class ScheduleEntry(BaseModel):
    session_id: int
    court_id: int
    start_time: datetime
    end_time: datetime

# Routes
@router.get("/training-sessions", response_model=List[TrainingSession])
async def list_training_sessions(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List available training sessions."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule, 
               StartDate as start_date, EndDate as end_date, CoachID as coach_id 
        FROM training_session
        """)
        sessions = cursor.fetchall()
        return sessions

@router.get("/training-sessions/{session_id}", response_model=TrainingSession)
async def get_training_session(session_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get training session details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule, 
               StartDate as start_date, EndDate as end_date, CoachID as coach_id 
        FROM training_session 
        WHERE SessionID = %s
        """, (session_id,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Training session not found")
        return session

@router.post("/training-sessions/{session_id}/enroll")
async def enroll_session(session_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Enroll in a training session (creates enroll record, links to order)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        # Check if user is a customer
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can enroll in training sessions")
        customer_id = customer['CustomerID']
        
        # Check if session exists and get price
        cursor.execute("SELECT SessionID, Price FROM training_session WHERE SessionID = %s", (session_id,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Training session not found")
        
        # Check if already enrolled
        cursor.execute("SELECT * FROM enroll WHERE CustomerID = %s AND SessionID = %s", (customer_id, session_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Already enrolled in this session")
        
        # Create or get an open order for the customer
        cursor.execute("""
        SELECT OrderID FROM `order` 
        WHERE CustomerID = %s AND PaymentID IS NULL 
        ORDER BY OrderDate DESC LIMIT 1
        """, (customer_id,))
        order = cursor.fetchone()
        if not order:
            cursor.execute("""
            INSERT INTO `order` (OrderDate, TotalAmount, CustomerID) 
            VALUES (NOW(), 0, %s)
            """, (customer_id,))
            order_id = cursor.lastrowid
        else:
            order_id = order['OrderID']
        
        # Add training to order details
        cursor.execute("""
        INSERT INTO orderdetails (OrderID, ItemType, Quantity, UnitPrice) 
        VALUES (%s, 'training', 1, %s)
        """, (order_id, session['Price']))
        
        # Update order total amount
        cursor.execute("""
        UPDATE `order` 
        SET TotalAmount = TotalAmount + %s 
        WHERE OrderID = %s
        """, (session['Price'], order_id))
        
        # Enroll customer in session
        cursor.execute("INSERT INTO enroll (CustomerID, SessionID) VALUES (%s, %s)", (customer_id, session_id))
        
        db.commit()
        return {"message": "Enrolled in training session successfully", "order_id": order_id}

@router.get("/training-sessions/schedule", response_model=List[ScheduleEntry])
async def get_user_training_schedule(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """View detailed schedule relevant to user."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT ts.SessionID as session_id, ts.CourtID as court_id, ts.StartTime as start_time, ts.EndTime as end_time
        FROM trainingschedule ts
        JOIN enroll e ON ts.SessionID = e.SessionID
        JOIN customer c ON e.CustomerID = c.CustomerID
        WHERE c.UserID = %s
        """, (user_id,))
        schedule = cursor.fetchall()
        return schedule