from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.user import get_customer_id_by_username
from app.models.order import process_order

# Create user order router
order_router = APIRouter(
    prefix="/order",
    tags=["User Orders"],
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "Not found"},
        400: {"description": "Bad Request"},
        500: {"description": "Internal Server Error"}
    },
)

# --- Pydantic Models for Request Body ---

class CourtOrderItem(BaseModel):
    court_id: int = Field(..., gt=0, description="ID of the court to book")
    start_time: datetime = Field(..., description="Booking start time")
    end_time: datetime = Field(..., description="Booking end time")

    @validator('end_time')
    def end_time_must_be_after_start_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v

class EquipmentOrderItem(BaseModel):
    equipment_id: int = Field(..., gt=0, description="ID of the equipment to rent")
    # quantity: int = Field(1, gt=0, description="Quantity of equipment to rent") # Add quantity later if needed

class FoodOrderItem(BaseModel):
    food_id: int = Field(..., gt=0, description="ID of the food item to order")
    # quantity: int = Field(1, gt=0, description="Quantity of food item to order") # Add quantity later if needed

class OrderRequest(BaseModel):
    court_orders: Optional[List[CourtOrderItem]] = None
    equipment_orders: Optional[List[EquipmentOrderItem]] = None
    food_orders: Optional[List[FoodOrderItem]] = None

    @validator('*', pre=True, each_item=True)
    def check_at_least_one_order_type(cls, v, values):
        if not values.get('court_orders') and not values.get('equipment_orders') and not values.get('food_orders'):
             raise ValueError('At least one type of order (court, equipment, or food) must be provided')
        return v


# --- Pydantic Model for Response ---

class OrderResponse(BaseModel):
    order_id: int
    total_amount: float
    message: str

# --- API Endpoint ---

@order_router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_user_order(
    order_data: OrderRequest,
    db: pymysql.connections.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user) # Requires user authentication
):
    """
    Place a new order for court bookings, equipment rentals, and/or food items.
    Requires user authentication.
    """
    username = current_user.get('Username')
    if not username:
        # This case should ideally be handled by get_current_user dependency raising 401
        logger.error("Username not found in token payload after authentication dependency.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error")

    try:
        # Get CustomerID associated with the authenticated user
        customer_id = get_customer_id_by_username(username, db)
        # get_customer_id_by_username raises HTTPException if not found or on DB error

        logger.info(f"Processing order for CustomerID: {customer_id} (Username: {username})")

        # Convert Pydantic models to dictionaries for the model function
        court_orders_dict = [item.dict() for item in order_data.court_orders] if order_data.court_orders else None
        equipment_orders_dict = [item.dict() for item in order_data.equipment_orders] if order_data.equipment_orders else None
        food_orders_dict = [item.dict() for item in order_data.food_orders] if order_data.food_orders else None

        # Call the model function to process the order
        result = process_order(
            customer_id=customer_id,
            court_orders=court_orders_dict,
            equipment_orders=equipment_orders_dict,
            food_orders=food_orders_dict,
            db=db
        )
        # process_order raises HTTPException on validation/processing errors

        logger.info(f"Order {result['order_id']} created successfully for CustomerID: {customer_id}")
        return OrderResponse(**result)

    except HTTPException as e:
        # Re-raise HTTPExceptions raised from model functions or validation
        raise e
    except Exception as e:
        # Catch any unexpected errors
        logger.exception(f"Unexpected error creating order for user {username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while creating the order.")