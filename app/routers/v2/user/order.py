from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Orders"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class OrderBase(BaseModel):
    order_id: int
    order_date: datetime
    total_amount: Optional[int] = None
    payment_id: Optional[int] = None

class OrderDetail(BaseModel):
    index: int
    item_type: str
    quantity: int
    unit_price: int

class OrderFull(OrderBase):
    details: List[OrderDetail] = []
    food_items: List[int] = []
    equipment_items: List[int] = []

class PaymentRequest(BaseModel):
    method: str  # 'cash', 'banking', 'card'

# Routes
@router.get("/orders", response_model=List[OrderBase])
async def list_orders(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List user's orders."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT o.OrderID as order_id, o.OrderDate as order_date, o.TotalAmount as total_amount, o.PaymentID as payment_id
        FROM `order` o
        JOIN customer c ON o.CustomerID = c.CustomerID
        WHERE c.UserID = %s
        """, (user_id,))
        orders = cursor.fetchall()
        return orders

@router.get("/orders/{order_id}", response_model=OrderFull)
async def get_order(order_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get order details (including orderdetails, orderfood, rent)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT o.OrderID as order_id, o.OrderDate as order_date, o.TotalAmount as total_amount, o.PaymentID as payment_id
        FROM `order` o
        JOIN customer c ON o.CustomerID = c.CustomerID
        WHERE c.UserID = %s AND o.OrderID = %s
        """, (user_id, order_id))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found or not authorized")
        
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

@router.post("/orders", response_model=OrderBase)
async def create_order(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Create a new order (can be initiated empty or with items)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can create orders")
        customer_id = customer['CustomerID']
        
        cursor.execute("""
        INSERT INTO `order` (OrderDate, TotalAmount, CustomerID) 
        VALUES (NOW(), 0, %s)
        """, (customer_id,))
        db.commit()
        order_id = cursor.lastrowid
        return {"order_id": order_id, "order_date": datetime.now(), "total_amount": 0, "payment_id": None}

@router.post("/orders/{order_id}/pay")
async def pay_order(order_id: int, payment_request: PaymentRequest, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Initiate payment process for an order (creates payment record)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT o.OrderID, o.TotalAmount, o.PaymentID, c.CustomerID
        FROM `order` o
        JOIN customer c ON o.CustomerID = c.CustomerID
        WHERE c.UserID = %s AND o.OrderID = %s
        """, (user_id, order_id))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found or not authorized")
        if order['PaymentID']:
            raise HTTPException(status_code=400, detail="Order already paid")
        if order['TotalAmount'] <= 0:
            raise HTTPException(status_code=400, detail="Order total amount must be greater than 0 to pay")
        
        cursor.execute("""
        INSERT INTO payment (OrderID, Date, Total, Customer_ID, Method, Time) 
        VALUES (%s, NOW(), %s, %s, %s, NOW())
        """, (order_id, order['TotalAmount'], order['CustomerID'], payment_request.method))
        payment_id = cursor.lastrowid
        
        cursor.execute("UPDATE `order` SET PaymentID = %s WHERE OrderID = %s", (payment_id, order_id))
        db.commit()
        return {"message": "Payment initiated successfully", "payment_id": payment_id}