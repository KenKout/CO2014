import pymysql
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from loguru import logger
from pydantic import BaseModel
from app.models.enums import EquipmentType # Import EquipmentType

# Pydantic model for response
class EquipmentResponse(BaseModel):
    EquipmentID: int
    Price: Optional[int] = None
    Type: Optional[EquipmentType] = None # Use EquipmentType enum
    Stock: Optional[int] = None
    Name: Optional[str] = None
    Brand: Optional[str] = None
    url: Optional[str] = None

def get_all_equipment(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all equipment from the database.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT EquipmentID, Price, Type, Stock, Name, Brand, url
                FROM Equipment
                """
            )
            equipment = cursor.fetchall()
            if not equipment:
                 logger.info("No equipment found in the database.")
            return equipment
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching all equipment: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching all equipment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")