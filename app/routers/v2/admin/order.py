from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Orders"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class OrderBase(BaseModel):
    order_id: int
    order_date: datetime
    total_amount: Optional[int] = None
    payment_id: Optional[int] = None
    customer_id: Optional[int] = None

class OrderDetail(BaseModel):
    index: int
    item_type: str
    quantity: int
    unit_price: int

class OrderFull(OrderBase):
    details: List[OrderDetail] = []
    food_items: List[int] = []
    equipment_items: List[int] = []

class OrderUpdate(BaseModel):
    total_amount: Optional[int] = None
    # Add other fields if needed for status or other updates

# Routes
@router.get("/orders", response_model=List[OrderBase])
async def list_orders(
    customer_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_admin: dict = Depends(get_current_admin),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """List all orders with filters."""
    with db.cursor() as cursor:
        query = """
        SELECT OrderID as order_id, OrderDate as order_date, TotalAmount as total_amount, 
               PaymentID as payment_id, CustomerID as customer_id
        FROM `order`
        WHERE 1=1
        """
        params = []
        if customer_id:
            query += " AND CustomerID = %s"
            params.append(customer_id)
        if start_date:
            query += " AND OrderDate >= %s"
            params.append(start_date)
        if end_date:
            query += " AND OrderDate <= %s"
            params.append(end_date)
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        return orders

@router.get("/orders/{order_id}", response_model=OrderFull)
async def get_order(order_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get any order details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT OrderID as order_id, OrderDate as order_date, TotalAmount as total_amount, 
               PaymentID as payment_id, CustomerID as customer_id
        FROM `order`
        WHERE OrderID = %s
        """, (order_id,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Get order details
        cursor.execute("""
        SELECT `Index` as `index`, ItemType as item_type, Quantity as quantity, UnitPrice as unit_price
        FROM orderdetails
        WHERE OrderID = %s
        """, (order_id,))
        details = cursor.fetchall()
        
        # Get food items
        cursor.execute("SELECT FoodID FROM orderfood WHERE OrderID = %s", (order_id,))
        food_items = [item['FoodID'] for item in cursor.fetchall()]
        
        # Get equipment items
        cursor.execute("SELECT EquipmentID FROM rent WHERE OrderID = %s", (order_id,))
        equipment_items = [item['EquipmentID'] for item in cursor.fetchall()]
        
        return {**order, "details": details, "food_items": food_items, "equipment_items": equipment_items}

@router.put("/orders/{order_id}", response_model=OrderBase)
async def update_order(order_id: int, update: OrderUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update order status/details."""
    with db.cursor() as cursor:
        cursor.execute("SELECT OrderID FROM `order` WHERE OrderID = %s", (order_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Order not found")
        
        query = "UPDATE `order` SET "
        params = []
        updates = []
        if update.total_amount is not None:
            updates.append("TotalAmount = %s")
            params.append(update.total_amount)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE OrderID = %s"
        params.append(order_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT OrderID as order_id, OrderDate as order_date, TotalAmount as total_amount, 
               PaymentID as payment_id, CustomerID as customer_id
        FROM `order`
        WHERE OrderID = %s
        """, (order_id,))
        updated_order = cursor.fetchone()
        return updated_order