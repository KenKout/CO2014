from fastapi import APIRouter, Depends, HTTPException
from typing import List
import pymysql
from app.database import get_db
from app.models.food import (
    get_all_food,
    FoodResponse, # Import the Pydantic model
)
from loguru import logger # Import loguru

# Create food router
food_router = APIRouter(
    prefix="/food",
    tags=["Food"],
    responses={404: {"description": "Not found"}},
)

@food_router.get("/", response_model=List[FoodResponse])
async def get_food(
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get all available food items.
    """
    try:
        food_list = get_all_food(db)
        return food_list
    except HTTPException as e:
        # Re-raise HTTPException to let FastAPI handle it
        raise e
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Error getting all food: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")