from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Food"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class Food(BaseModel):
    food_id: int
    name: str
    category: str
    price: Optional[int] = None
    stock: Optional[int] = None

class FoodCreate(BaseModel):
    name: str
    category: str  # 'drinks', 'snacks', 'meals'
    price: int
    stock: int = 0

class FoodUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None  # 'drinks', 'snacks', 'meals'
    price: Optional[int] = None
    stock: Optional[int] = None

# Routes
@router.get("/food", response_model=List[Food])
async def list_food(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all food items."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT FoodID as food_id, Name as name, Category as category, Price as price, Stock as stock
        FROM cafeteriafood
        """)
        food_items = cursor.fetchall()
        return food_items

@router.post("/food", response_model=Food)
async def create_food(food: FoodCreate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Add new food item."""
    if food.category not in ['drinks', 'snacks', 'meals']:
        raise HTTPException(status_code=400, detail="Invalid category value")
    
    with db.cursor() as cursor:
        cursor.execute("""
        INSERT INTO cafeteriafood (Name, Category, Price, Stock)
        VALUES (%s, %s, %s, %s)
        """, (food.name, food.category, food.price, food.stock))
        db.commit()
        food_id = cursor.lastrowid
        return {**food.dict(), "food_id": food_id}

@router.get("/food/{food_id}", response_model=Food)
async def get_food(food_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get food item details."""
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

@router.put("/food/{food_id}", response_model=Food)
async def update_food(food_id: int, update: FoodUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update food item details."""
    with db.cursor() as cursor:
        cursor.execute("SELECT FoodID FROM cafeteriafood WHERE FoodID = %s", (food_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Food item not found")
        
        query = "UPDATE cafeteriafood SET "
        params = []
        updates = []
        if update.name is not None:
            updates.append("Name = %s")
            params.append(update.name)
        if update.category is not None:
            if update.category not in ['drinks', 'snacks', 'meals']:
                raise HTTPException(status_code=400, detail="Invalid category value")
            updates.append("Category = %s")
            params.append(update.category)
        if update.price is not None:
            updates.append("Price = %s")
            params.append(update.price)
        if update.stock is not None:
            updates.append("Stock = %s")
            params.append(update.stock)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE FoodID = %s"
        params.append(food_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT FoodID as food_id, Name as name, Category as category, Price as price, Stock as stock
        FROM cafeteriafood
        WHERE FoodID = %s
        """, (food_id,))
        updated_food = cursor.fetchone()
        return updated_food

@router.delete("/food/{food_id}")
async def delete_food(food_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete food item."""
    with db.cursor() as cursor:
        cursor.execute("SELECT FoodID FROM cafeteriafood WHERE FoodID = %s", (food_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Food item not found")
        
        cursor.execute("DELETE FROM cafeteriafood WHERE FoodID = %s", (food_id,))
        db.commit()
        return {"message": "Food item deleted successfully"}