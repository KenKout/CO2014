from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
from app.models.enums import FoodCategory

# Import model functions
from app.models.food import (
    create_food_item_admin,
    get_all_food_items_admin,
    get_food_item_by_id_admin,
    update_food_item_admin,
    delete_food_item_admin
)

# Define the router
admin_food_router = APIRouter(
    prefix="/food",
    tags=["Admin - Cafeteria Food"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

class FoodBase(BaseModel):
    Name: str = Field(..., max_length=255)
    Category: FoodCategory
    Price: int = Field(..., ge=0)
    Stock: int = Field(..., ge=0)
    url: Optional[HttpUrl] = Field(None, description="URL for the food item image") # Use HttpUrl for validation

class AdminFoodCreateRequest(FoodBase):
    # FoodID is now AUTO_INCREMENT, removed from request.
    pass # Inherits all fields from FoodBase

class AdminFoodUpdateRequest(BaseModel):
    Name: Optional[str] = Field(None, max_length=255)
    Category: Optional[FoodCategory] = None
    Price: Optional[int] = Field(None, ge=0)
    Stock: Optional[int] = Field(None, ge=0)
    url: Optional[HttpUrl] = Field(None, description="URL for the food item image")

class AdminFoodResponse(FoodBase):
    FoodID: int

# --- Routes ---

# Placeholder for POST /
@admin_food_router.post("/", response_model=AdminFoodResponse, status_code=status.HTTP_201_CREATED)
async def create_food_item(
    food_data: AdminFoodCreateRequest,
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to create a new cafeteria food item.
    Requires admin privileges.
    """
    # Removed FoodID from log message as it's auto-generated
    logger.info(f"Admin request to create food item: {food_data.Name}")
    try:
        created_item = create_food_item_admin(food_data=food_data, db=db)
        return created_item
    except HTTPException as e:
        raise e # Re-raise 400, 409, 500
    except Exception as e:
        # Removed FoodID from log message
        logger.exception(f"Admin: Unexpected error creating food item {food_data.Name}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET / - List all food items
@admin_food_router.get("/", response_model=List[AdminFoodResponse])
async def get_all_food_items(db: pymysql.connections.Connection = Depends(get_db)):
    """
    Admin route to retrieve a list of all cafeteria food items.
    Requires admin privileges.
    """
    logger.info("Admin request to fetch all food items.")
    try:
        items = get_all_food_items_admin(db=db)
        return items
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching all food items: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{food_id} - Get specific food item
@admin_food_router.get("/{food_id}", response_model=AdminFoodResponse)
async def get_food_item_detail(
    food_id: int = Path(..., description="The ID of the food item to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific food item.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch food item ID: {food_id}")
    try:
        item = get_food_item_by_id_admin(food_id=food_id, db=db)
        # Model function raises 404 if not found
        return item
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching food item ID {food_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# PUT /{food_id} - Update specific food item
@admin_food_router.put("/{food_id}", response_model=AdminFoodResponse)
async def update_food_item_detail(
    food_id: int = Path(..., description="The ID of the food item to update."),
    update_data: AdminFoodUpdateRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update details for a specific food item.
    Requires admin privileges.
    """
    logger.info(f"Admin request to update food item ID: {food_id}")
    if not update_data.model_dump(exclude_unset=True):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )
    
    try:
        updated_item = update_food_item_admin(
            food_id=food_id,
            update_data=update_data,
            db=db
        )
        # Model function handles 404 and returns updated details
        return updated_item
    except HTTPException as e:
        raise e # Re-raise 400, 404, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error updating food item ID {food_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# DELETE /{food_id} - Delete specific food item
@admin_food_router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food_item(
    food_id: int = Path(..., description="The ID of the food item to delete."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to delete a cafeteria food item.
    Requires admin privileges.
    WARNING: Check for dependencies (OrderFood) before deleting.
    """
    logger.warning(f"Admin request to DELETE food item ID: {food_id}")
    try:
        delete_food_item_admin(food_id=food_id, db=db)
        # No return needed for 204 No Content
    except HTTPException as e:
        raise e # Re-raise 404, 409, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error deleting food item ID {food_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")