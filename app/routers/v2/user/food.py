from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Food"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Food(BaseModel):
    food_id: int
    name: str
    category: str
    price: Optional[int] = None
    stock: Optional[int] = None

class OrderFoodRequest(BaseModel):
    food_id: int
    quantity: int = 1

# Routes
@router.get("/food", response_model=List[Food])
async def list_food(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List available food."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT FoodID as food_id, Name as name, Category as category, Price as price, Stock as stock 
        FROM cafeteriafood 
        WHERE Stock > 0
        """)
        food_items = cursor.fetchall()
        return food_items

@router.get("/food/{food_id}", response_model=Food)
async def get_food(food_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get food details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT FoodID as food_id, Name as name, Category as category, Price as price, Stock as stock 
        FROM cafeteriafood 
        WHERE FoodID = %s
        """, (food_id,))
        food = cursor.fetchone()
        if not food:
            raise HTTPException(status_code=404, detail="Food item not found")
        return food

@router.post("/food/order")
async def order_food(order_request: OrderFoodRequest, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Order food (adds to an order)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        # Check if user is a customer
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can order food")
        customer_id = customer['CustomerID']
        
        # Check food availability
        cursor.execute("""
        SELECT FoodID, Stock, Price 
        FROM cafeteriafood 
        WHERE FoodID = %s AND Stock >= %s
        """, (order_request.food_id, order_request.quantity))
        food = cursor.fetchone()
        if not food:
            raise HTTPException(status_code=400, detail="Food not available or insufficient stock")
        
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
        
        # Add food to order details
        total_price = food['Price'] * order_request.quantity
        cursor.execute("""
        INSERT INTO orderdetails (OrderID, ItemType, Quantity, UnitPrice) 
        VALUES (%s, 'food', %s, %s)
        """, (order_id, order_request.quantity, food['Price']))
        
        # Link food to order in orderfood table
        cursor.execute("""
        INSERT INTO orderfood (OrderID, FoodID) 
        VALUES (%s, %s)
        """, (order_id, order_request.food_id))
        
        # Update order total amount
        cursor.execute("""
        UPDATE `order` 
        SET TotalAmount = TotalAmount + %s 
        WHERE OrderID = %s
        """, (total_price, order_id))
        
        # Reduce food stock
        cursor.execute("""
        UPDATE cafeteriafood 
        SET Stock = Stock - %s 
        WHERE FoodID = %s
        """, (order_request.quantity, order_request.food_id))
        
        db.commit()
        return {"message": "Food ordered successfully", "order_id": order_id}