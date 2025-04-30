from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel, Field, validator, EmailStr
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin, get_password_hash
from app.models.enums import UserType
# Import the necessary model functions
from app.models.user import (
    create_user_admin,
    get_user_by_username,
    get_all_users_admin,
    get_user_details_admin,
    update_user_admin,
    delete_user_admin,
    promote_customer_to_staff_admin,
    get_customer_count_admin,
    promote_staff_to_coach_admin # Added import
)

# Define the router
admin_user_router = APIRouter(
    prefix="/users",
    tags=["Admin - Users"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth to all routes in this router
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

class AdminUserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    phone: str = Field(..., max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    user_type: UserType = Field(..., description="Type of user: Customer or Staff")
    salary: Optional[int] = Field(None, gt=0, description="Required if user_type is Staff")
    date_of_birth: Optional[str] = Field(None, description="Required if user_type is Customer (YYYY-MM-DD)") # Assuming date as string for simplicity

    @validator('salary', always=True)
    def check_salary_for_staff(cls, v, values):
        if values.get('user_type') == UserType.STAFF and v is None:
            raise ValueError('Salary is required for Staff users')
        if values.get('user_type') == UserType.CUSTOMER and v is not None:
             logger.warning("Salary provided for Cusủtomer user type, it will be ignored.")
             # Optionally raise ValueError('Salary should not be provided for Customer users')
        return v

    @validator('date_of_birth', always=True)
    def check_dob_for_customer(cls, v, values):
        if values.get('user_type') == UserType.CUSTOMER and v is None:
            raise ValueError('Date of Birth is required for Customer users')
        if values.get('user_type') == UserType.STAFF and v is not None:
            logger.warning("Date of Birth provided for Staff user type, it will be ignored.")
            # Optionally raise ValueError('Date of Birth should not be provided for Staff users')
        return v

# --- Response Models for GET /users ---
class CustomerDetail(BaseModel):
    CustomerID: int
    Name: str
    Date_of_Birth: Optional[str] = None # Make optional as it might not always be set? Or ensure it is.
class CustomerCountResponse(BaseModel):
    count: int

class StaffDetail(BaseModel):
    StaffID: int
    Name: str
    Salary: Optional[int] = None # Make optional as it might not always be set? Or ensure it is.

class UserListDetailResponse(BaseModel):
    Username: str
    Phone: str
    UserType: UserType
    JoinDate: str # Keep as string from model function
    details: Optional[dict] = None # This will hold CustomerDetail or StaffDetail dict

# --- Response Model for POST /users ---
class UserCreateResponse(BaseModel): # Renamed from UserResponse for clarity
    Username: str
    Phone: str
    UserType: UserType
    JoinDate: str
    message: Optional[str] = None

# --- Request Model for PUT /users/{username} ---
class AdminUserUpdateRequest(BaseModel):
    # All fields are optional for update
    phone: Optional[str] = Field(None, max_length=20)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    # For Customer:
    date_of_birth: Optional[str] = Field(None, description="YYYY-MM-DD format")
    # For Staff:
    salary: Optional[int] = Field(None, gt=0)

    # Add validation if needed, e.g., ensure DOB is not provided for Staff update?
    # Pydantic v2: model_validator
    # @model_validator(mode='before')
    # def check_fields_based_on_type(cls, values):
    #     # This validation is tricky without knowing the user type beforehand.
    #     # The model function handles ignoring irrelevant fields based on actual user type.
    #     return values

# --- Response Model for DELETE ---
class DeleteResponse(BaseModel):
    message: str

# --- Request Model for Promote to Staff ---
class PromoteToStaffRequest(BaseModel):
    salary: int = Field(..., gt=0, description="The salary for the new staff member.")

# --- Request Model for Promote to Coach ---
class PromoteToCoachRequest(BaseModel):
    description: str = Field(..., description="Coach description.")
    image_url: str = Field(..., description="URL for the coach's image.")


# --- Routes ---

# POST /users - Create a new user
@admin_user_router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserCreateResponse)
async def create_user(
    user_data: AdminUserCreateRequest,
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to create a new user (Customer or Staff).
    Requires admin privileges.
    """
    logger.info(f"Admin attempting to create user: {user_data.username} as {user_data.user_type}")

    # Check if user already exists
    existing_user = get_user_by_username(user_data.username, db)
    if existing_user:
        logger.warning(f"Attempt to create existing user: {user_data.username}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already registered")

    hashed_password = get_password_hash(user_data.password)

    try:
        # Call the model function to create the user
        created_user_info = create_user_admin(db=db, user_data=user_data, hashed_password=hashed_password)
        # The model function now returns a dict including a message
        return created_user_info # This dict matches the simplified UserResponse
    except HTTPException as e:
        # Re-raise HTTPExceptions (like 409 from model or 400 for ValueError)
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error creating user {user_data.username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


# GET /users - List all users
@admin_user_router.get("/", response_model=List[UserListDetailResponse])
async def get_users(
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve a list of all users (Customers and Staff)
    with their specific details. Requires admin privileges.
    """
    logger.info("Admin request to fetch all users.")
    try:
        users = get_all_users_admin(db=db)
        # The model function already processes the data into the desired structure
        # Pydantic will validate the structure against UserListDetailResponse
        return users
    except HTTPException as e:
        # Re-raise HTTPExceptions from the model layer
        raise e
    except Exception as e:
        logger.exception("Unexpected error fetching all users: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


# GET /users/{username} - Get details for a specific user
@admin_user_router.get("/{username}", response_model=UserListDetailResponse)
async def get_user_detail(
    username: str, # Get username from path
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific user by username.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch details for user: {username}")
    try:
        user_details = get_user_details_admin(username=username, db=db)
        # The model function handles the 404 case by raising HTTPException
        return user_details
    except HTTPException as e:
        # Re-raise HTTPExceptions (like 404 Not Found)
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error fetching details for user {username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


# PUT /users/{username} - Update user details
@admin_user_router.put("/{username}", response_model=UserListDetailResponse)
async def update_user(
    username: str, # Get username from path
    update_data: AdminUserUpdateRequest, # Get update data from body
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update user details (Phone, Name, DOB/Salary).
    Requires admin privileges.
    """
    logger.info(f"Admin request to update user: {username}")

    # Check if at least one field is provided for update
    if not update_data.model_dump(exclude_unset=True):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )

    try:
        updated_user_details = update_user_admin(
            username=username,
            db=db,
            update_data=update_data
        )
        # Model function handles 404 and returns updated details
        return updated_user_details
    except HTTPException as e:
        # Re-raise HTTPExceptions (like 404 Not Found)
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error updating user {username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


# DELETE /users/{username} - Delete a user
@admin_user_router.delete("/{username}", response_model=DeleteResponse, status_code=status.HTTP_200_OK)
async def delete_user(
    username: str, # Get username from path
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to delete a user (and associated Customer/Staff/Coach records).
    Requires admin privileges.
    WARNING: May fail if user is referenced in other tables (bookings, orders, etc.)
             due to foreign key constraints.
    """
    logger.warning(f"Admin request to DELETE user: {username}") # Log as warning due to destructive nature
    try:
        result = delete_user_admin(username=username, db=db)
        # Model function handles 404 and returns success message or raises 409/500
        return result
    except HTTPException as e:
        # Re-raise HTTPExceptions (like 404 Not Found, 409 Conflict)
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error deleting user {username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


# PUT /users/{username}/promote/staff - Promote a Customer to Staff
@admin_user_router.put("/{username}/promote/staff", response_model=UserListDetailResponse)
async def promote_user_to_staff(
    username: str, # Get username from path
    promotion_data: PromoteToStaffRequest, # Get salary from body
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to promote a Customer user to Staff.
    Requires admin privileges and the new salary in the request body.
    """
    logger.info(f"Admin request to promote user '{username}' to Staff.")
    try:
        updated_user_details = promote_customer_to_staff_admin(
            username=username,
            db=db,
            salary=promotion_data.salary
        )
        # Model function handles 404/400 and returns updated details
        return updated_user_details
    except HTTPException as e:
        # Re-raise HTTPExceptions (like 404 Not Found, 400 Bad Request)
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error promoting user {username} to staff: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


# PUT /users/{username}/promote/coach - Promote a Staff member to Coach
@admin_user_router.put("/{username}/promote/coach", response_model=UserListDetailResponse)
async def promote_user_to_coach(
    username: str, # Get username from path
    promotion_data: PromoteToCoachRequest, # Get coach details from body
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to promote a Staff user to Coach by adding a Coach record.
    Requires admin privileges, coach description, and image URL.
    """
    logger.info(f"Admin request to promote user '{username}' to Coach.")
    try:
        # Note: The response model UserListDetailResponse doesn't explicitly show coach details yet.
        # The model function get_user_details_admin would need modification to include this.
        # For now, a successful response confirms the operation.
        updated_user_details = promote_staff_to_coach_admin(
            username=username,
            db=db,
            description=promotion_data.description,
            image_url=promotion_data.image_url
        )
        # The model function adds a success message to the returned dict
        return updated_user_details
    except HTTPException as e:
        # Re-raise HTTPExceptions (like 404 Not Found, 400 Bad Request, 409 Conflict)
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error promoting user {username} to coach: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@admin_user_router.get("/stats/customer-count", response_model=CustomerCountResponse)
async def get_customer_count(
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to get the total count of customers in the system.
    Uses the GetCustomerCount() SQL function.
    Requires admin privileges.
    """
    logger.info("Admin request to fetch total customer count.")
    try:
        result = get_customer_count_admin(db=db)
        return result
    except HTTPException as e:
        # Re-raise HTTPExceptions from the model layer
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error fetching customer count: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
# End of User Management Routes