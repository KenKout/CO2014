from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
from app.models.enums import EquipmentType

# Import model functions
from app.models.equipment import (
    create_equipment_admin,
    get_all_equipment_admin,
    get_equipment_by_id_admin,
    update_equipment_admin,
    delete_equipment_admin
)

# Define the router
admin_equipment_router = APIRouter(
    prefix="/equipment",
    tags=["Admin - Equipment"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

class EquipmentBase(BaseModel):
    Name: str = Field(..., max_length=255)
    Type: EquipmentType
    Brand: Optional[str] = Field(None, max_length=100)
    Price: int = Field(..., ge=0)
    Stock: int = Field(..., ge=0)
    url: Optional[HttpUrl] = Field(None, description="URL for the equipment image")

class AdminEquipmentCreateRequest(EquipmentBase):
    # EquipmentID is now AUTO_INCREMENT, removed from request.
    # Inherits all fields from EquipmentBase
    pass

class AdminEquipmentUpdateRequest(BaseModel):
    Name: Optional[str] = Field(None, max_length=255)
    Type: Optional[EquipmentType] = None
    Brand: Optional[str] = Field(None, max_length=100)
    Price: Optional[int] = Field(None, ge=0)
    Stock: Optional[int] = Field(None, ge=0)
    url: Optional[HttpUrl] = Field(None, description="URL for the equipment image")

class AdminEquipmentResponse(EquipmentBase):
    EquipmentID: int

# --- Routes ---

# Placeholder for POST /
@admin_equipment_router.post("/", response_model=AdminEquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    equipment_data: AdminEquipmentCreateRequest,
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to create a new equipment item.
    Requires admin privileges.
    """
    # Removed EquipmentID from log message as it's auto-generated
    logger.info(f"Admin request to create equipment item: {equipment_data.Name}")
    try:
        created_item = create_equipment_admin(equipment_data=equipment_data, db=db)
        return created_item
    except HTTPException as e:
        raise e # Re-raise 400, 409, 500
    except Exception as e:
        # Removed EquipmentID from log message
        logger.exception(f"Admin: Unexpected error creating equipment item {equipment_data.Name}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET / - List all equipment
@admin_equipment_router.get("/", response_model=List[AdminEquipmentResponse])
async def get_all_equipment(db: pymysql.connections.Connection = Depends(get_db)):
    """
    Admin route to retrieve a list of all equipment items.
    Requires admin privileges.
    """
    logger.info("Admin request to fetch all equipment.")
    try:
        items = get_all_equipment_admin(db=db)
        return items
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching all equipment: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{equipment_id} - Get specific equipment
@admin_equipment_router.get("/{equipment_id}", response_model=AdminEquipmentResponse)
async def get_equipment_detail(
    equipment_id: int = Path(..., description="The ID of the equipment item to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific equipment item.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch equipment ID: {equipment_id}")
    try:
        item = get_equipment_by_id_admin(equipment_id=equipment_id, db=db)
        # Model function raises 404 if not found
        return item
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching equipment ID {equipment_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# PUT /{equipment_id} - Update specific equipment
@admin_equipment_router.put("/{equipment_id}", response_model=AdminEquipmentResponse)
async def update_equipment_detail(
    equipment_id: int = Path(..., description="The ID of the equipment item to update."),
    update_data: AdminEquipmentUpdateRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update details for a specific equipment item.
    Requires admin privileges.
    """
    logger.info(f"Admin request to update equipment ID: {equipment_id}")
    if not update_data.model_dump(exclude_unset=True):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )
    
    try:
        updated_item = update_equipment_admin(
            equipment_id=equipment_id,
            update_data=update_data,
            db=db
        )
        # Model function handles 404 and returns updated details
        return updated_item
    except HTTPException as e:
        raise e # Re-raise 400, 404, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error updating equipment ID {equipment_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# DELETE /{equipment_id} - Delete specific equipment
@admin_equipment_router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    equipment_id: int = Path(..., description="The ID of the equipment item to delete."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to delete an equipment item.
    Requires admin privileges.
    WARNING: Check for dependencies (Rent) before deleting.
    """
    logger.warning(f"Admin request to DELETE equipment ID: {equipment_id}")
    try:
        delete_equipment_admin(equipment_id=equipment_id, db=db)
        # No return needed for 204 No Content
    except HTTPException as e:
        raise e # Re-raise 404, 409, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error deleting equipment ID {equipment_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")