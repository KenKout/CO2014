from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Equipment"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class Equipment(BaseModel):
    equipment_id: int
    name: str
    type: str
    brand: Optional[str] = None
    price: Optional[int] = None
    status: str
    stock: Optional[int] = None

class EquipmentCreate(BaseModel):
    name: str
    type: str  # 'racket', 'shoes', 'clothes'
    brand: Optional[str] = None
    price: int
    status: str = "available"  # 'available', 'unavailable'
    stock: int = 0

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None  # 'racket', 'shoes', 'clothes'
    brand: Optional[str] = None
    price: Optional[int] = None
    status: Optional[str] = None  # 'available', 'unavailable'
    stock: Optional[int] = None

# Routes
@router.get("/equipment", response_model=List[Equipment])
async def list_equipment(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all equipment."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT EquipmentID as equipment_id, Name as name, Type as type, Brand as brand, 
               Price as price, Status as status, Stock as stock
        FROM equipment
        """)
        equipment = cursor.fetchall()
        return equipment

@router.post("/equipment", response_model=Equipment)
async def create_equipment(equipment: EquipmentCreate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Add new equipment."""
    if equipment.status not in ['available', 'unavailable']:
        raise HTTPException(status_code=400, detail="Invalid status value")
    if equipment.type not in ['racket', 'shoes', 'clothes']:
        raise HTTPException(status_code=400, detail="Invalid type value")
    
    with db.cursor() as cursor:
        cursor.execute("""
        INSERT INTO equipment (Name, Type, Brand, Price, Status, Stock)
        VALUES (%s, %s, %s, %s, %s, %s)
        """, (equipment.name, equipment.type, equipment.brand, equipment.price, equipment.status, equipment.stock))
        db.commit()
        equipment_id = cursor.lastrowid
        return {**equipment.dict(), "equipment_id": equipment_id}

@router.get("/equipment/{equipment_id}", response_model=Equipment)
async def get_equipment(equipment_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
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

@router.put("/equipment/{equipment_id}", response_model=Equipment)
async def update_equipment(equipment_id: int, update: EquipmentUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update equipment details."""
    with db.cursor() as cursor:
        cursor.execute("SELECT EquipmentID FROM equipment WHERE EquipmentID = %s", (equipment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Equipment not found")
        
        query = "UPDATE equipment SET "
        params = []
        updates = []
        if update.name is not None:
            updates.append("Name = %s")
            params.append(update.name)
        if update.type is not None:
            if update.type not in ['racket', 'shoes', 'clothes']:
                raise HTTPException(status_code=400, detail="Invalid type value")
            updates.append("Type = %s")
            params.append(update.type)
        if update.brand is not None:
            updates.append("Brand = %s")
            params.append(update.brand)
        if update.price is not None:
            updates.append("Price = %s")
            params.append(update.price)
        if update.status is not None:
            if update.status not in ['available', 'unavailable']:
                raise HTTPException(status_code=400, detail="Invalid status value")
            updates.append("Status = %s")
            params.append(update.status)
        if update.stock is not None:
            updates.append("Stock = %s")
            params.append(update.stock)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE EquipmentID = %s"
        params.append(equipment_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT EquipmentID as equipment_id, Name as name, Type as type, Brand as brand, 
               Price as price, Status as status, Stock as stock
        FROM equipment
        WHERE EquipmentID = %s
        """, (equipment_id,))
        updated_equipment = cursor.fetchone()
        return updated_equipment

@router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete equipment."""
    with db.cursor() as cursor:
        cursor.execute("SELECT EquipmentID FROM equipment WHERE EquipmentID = %s", (equipment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Equipment not found")
        
        cursor.execute("DELETE FROM equipment WHERE EquipmentID = %s", (equipment_id,))
        db.commit()
        return {"message": "Equipment deleted successfully"}