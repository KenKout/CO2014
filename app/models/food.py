import pymysql
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from loguru import logger
from pydantic import BaseModel
from app.models.enums import FoodCategory # Import FoodCategory

# Pydantic model for response
class FoodResponse(BaseModel):
    FoodID: int
    Stock: Optional[int] = None
    Name: Optional[str] = None
    Category: Optional[FoodCategory] = None # Use FoodCategory enum
    Price: Optional[int] = None
    url: Optional[str] = None

def get_all_food(db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Get all food items from the database.
    """
    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT FoodID, Stock, Name, Category, Price, url
                FROM CafeteriaFood
                """
            )
            food_items = cursor.fetchall()
            if not food_items:
                 logger.info("No food items found in the database.")
            return food_items
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching all food items: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching all food items: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")