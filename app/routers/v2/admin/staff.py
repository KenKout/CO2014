from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin, get_password_hash

router = APIRouter(
    prefix="/admin",
    tags=["Admin Staff"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class Staff(BaseModel):
    staff_id: int
    user_id: Optional[int] = None
    name: str
    salary: Optional[int] = None
    hired_date: Optional[datetime] = None

class StaffCreate(BaseModel):
    username: str
    password: str
    phone: str
    name: str
    salary: int
    hired_date: Optional[datetime] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    salary: Optional[int] = None
    hired_date: Optional[datetime] = None
    phone: Optional[str] = None

# Routes
@router.get("/staff", response_model=List[Staff])
async def list_staff(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all staff."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT StaffID as staff_id, UserID as user_id, Name as name, Salary as salary, HiredDate as hired_date
        FROM staff
        """)
        staff_list = cursor.fetchall()
        return staff_list

@router.post("/staff", response_model=Staff)
async def create_staff(staff: StaffCreate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Create staff user."""
    try:
        with db.cursor() as cursor:
            hashed_password = get_password_hash(staff.password)
            # Insert into user table
            cursor.execute("""
            INSERT INTO user (Username, Password, Phone, UserType, JoinDate)
            VALUES (%s, %s, %s, 'staff', NOW())
            """, (staff.username, hashed_password, staff.phone))
            user_id = cursor.lastrowid
            
            # Insert into staff table
            cursor.execute("""
            INSERT INTO staff (UserID, Name, Salary, HiredDate)
            VALUES (%s, %s, %s, %s)
            """, (user_id, staff.name, staff.salary, staff.hired_date if staff.hired_date else datetime.now()))
            db.commit()
            staff_id = cursor.lastrowid
            return {"staff_id": staff_id, "user_id": user_id, "name": staff.name, "salary": staff.salary, "hired_date": staff.hired_date}
    except pymysql.err.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already registered")

@router.get("/staff/{staff_id}", response_model=Staff)
async def get_staff(staff_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get staff details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT StaffID as staff_id, UserID as user_id, Name as name, Salary as salary, HiredDate as hired_date
        FROM staff
        WHERE StaffID = %s
        """, (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
        return staff

@router.put("/staff/{staff_id}", response_model=Staff)
async def update_staff(staff_id: int, update: StaffUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update staff details."""
    with db.cursor() as cursor:
        cursor.execute("SELECT StaffID, UserID FROM staff WHERE StaffID = %s", (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
        
        # Update staff table
        query = "UPDATE staff SET "
        params = []
        updates = []
        if update.name is not None:
            updates.append("Name = %s")
            params.append(update.name)
        if update.salary is not None:
            updates.append("Salary = %s")
            params.append(update.salary)
        if update.hired_date is not None:
            updates.append("HiredDate = %s")
            params.append(update.hired_date)
        
        if updates:
            query += ", ".join(updates) + " WHERE StaffID = %s"
            params.append(staff_id)
            cursor.execute(query, params)
        
        # Update user table if phone is provided
        if update.phone is not None:
            cursor.execute("UPDATE user SET Phone = %s WHERE UserID = %s", (update.phone, staff['UserID']))
        
        db.commit()
        
        cursor.execute("""
        SELECT StaffID as staff_id, UserID as user_id, Name as name, Salary as salary, HiredDate as hired_date
        FROM staff
        WHERE StaffID = %s
        """, (staff_id,))
        updated_staff = cursor.fetchone()
        return updated_staff

@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete staff user."""
    with db.cursor() as cursor:
        cursor.execute("SELECT StaffID, UserID FROM staff WHERE StaffID = %s", (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
        
        # Delete from staff table
        cursor.execute("DELETE FROM staff WHERE StaffID = %s", (staff_id,))
        
        # Delete from user table
        cursor.execute("DELETE FROM user WHERE UserID = %s", (staff['UserID'],))
        
        db.commit()
        return {"message": "Staff deleted successfully"}