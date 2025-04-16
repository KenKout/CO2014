from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Equipment"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Equipment(BaseModel):
    equipment_id: int
    name: str
    type: str
    brand: Optional[str] = None
    price: Optional[int] = None
    status: str
    stock: Optional[int] = None

class RentRequest(BaseModel):
    equipment_id: int
    quantity: int = 1

# Routes
@router.get("/equipment", response_model=List[Equipment])
async def list_equipment(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List available equipment."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT EquipmentID as equipment_id, Name as name, Type as type, Brand as brand, 
               Price as price, Status as status, Stock as stock 
        FROM equipment 
        WHERE Status = 'available' AND Stock > 0
        """)
        equipment = cursor.fetchall()
        return equipment

@router.get("/equipment/{equipment_id}", response_model=Equipment)
async def get_equipment(equipment_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get equipment details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT EquipmentID as equipment_id, Name as name, Type as type, Brand as brand, 
               Price as price, Status as status, Stock as stock 
        FROM equipment 
        WHERE EquipmentID = %s
        """, (equipment_id,))
        equipment = cursor.fetchone()
        if not equipment:
            raise HTTPException(status_code=404, detail="Equipment not found")
        return equipment

@router.post("/equipment/rent")
async def rent_equipment(rent_request: RentRequest, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Rent equipment (adds to an order)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        # Check if user is a customer
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can rent equipment")
        customer_id = customer['CustomerID']
        
        # Check equipment availability
        cursor.execute("""
        SELECT EquipmentID, Stock, Price 
        FROM equipment 
        WHERE EquipmentID = %s AND Status = 'available' AND Stock >= %s
        """, (rent_request.equipment_id, rent_request.quantity))
        equipment = cursor.fetchone()
        if not equipment:
            raise HTTPException(status_code=400, detail="Equipment not available or insufficient stock")
        
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
        
        # Add equipment to order details
        total_price = equipment['Price'] * rent_request.quantity
        cursor.execute("""
        INSERT INTO orderdetails (OrderID, ItemType, Quantity, UnitPrice) 
        VALUES (%s, 'equipment', %s, %s)
        """, (order_id, rent_request.quantity, equipment['Price']))
        
        # Link equipment to order in rent table
        cursor.execute("""
        INSERT INTO rent (OrderID, EquipmentID) 
        VALUES (%s, %s)
        """, (order_id, rent_request.equipment_id))
        
        # Update order total amount
        cursor.execute("""
        UPDATE `order` 
        SET TotalAmount = TotalAmount + %s 
        WHERE OrderID = %s
        """, (total_price, order_id))
        
        # Reduce equipment stock
        cursor.execute("""
        UPDATE equipment 
        SET Stock = Stock - %s 
        WHERE EquipmentID = %s
        """, (rent_request.quantity, rent_request.equipment_id))
        
        db.commit()
        return {"message": "Equipment rented successfully", "order_id": order_id}