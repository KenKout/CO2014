from fastapi import APIRouter, Depends, HTTPException
from typing import List
import pymysql
from app.database import get_db
from app.models.equipment import (
    get_all_equipment,
    EquipmentResponse, # Import the Pydantic model
)
from loguru import logger # Import loguru

# Create equipment router
equipment_router = APIRouter(
    prefix="/equipment",
    tags=["Equipment"],
    responses={404: {"description": "Not found"}},
)

@equipment_router.get("/", response_model=List[EquipmentResponse])
async def get_equipment(
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get all available equipment.
    """
    try:
        equipment_list = get_all_equipment(db)
        return equipment_list
    except HTTPException as e:
        # Re-raise HTTPException to let FastAPI handle it
        raise e
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Error getting all equipment: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")