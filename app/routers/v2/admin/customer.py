from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Customers"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class Customer(BaseModel):
    customer_id: int
    name: str
    user_id: Optional[int] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None

# Routes
@router.get("/customers", response_model=List[Customer])
async def list_customers(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all customers."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT CustomerID as customer_id, Name as name, UserID as user_id
        FROM customer
        """)
        customers = cursor.fetchall()
        return customers

@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get customer details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT CustomerID as customer_id, Name as name, UserID as user_id
        FROM customer
        WHERE CustomerID = %s
        """, (customer_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

@router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: int, update: CustomerUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update customer details."""
    with db.cursor() as cursor:
        cursor.execute("SELECT CustomerID FROM customer WHERE CustomerID = %s", (customer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Customer not found")
        
        query = "UPDATE customer SET "
        params = []
        updates = []
        if update.name is not None:
            updates.append("Name = %s")
            params.append(update.name)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE CustomerID = %s"
        params.append(customer_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT CustomerID as customer_id, Name as name, UserID as user_id
        FROM customer
        WHERE CustomerID = %s
        """, (customer_id,))
        updated_customer = cursor.fetchone()
        return updated_customer