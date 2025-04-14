from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import customer as customer_model  # Import your Customer model
# from app.schemas import customer as customer_schema # Import schemas if you have them, if not we will define them here

router_customer = APIRouter(prefix="/customer", tags=["Customer"])

# Define Pydantic schemas if you haven't already in schemas/customer.py
from pydantic import BaseModel

class CustomerCreate(BaseModel):
    name: str
    user_id: int # To link customer to a user

class CustomerUpdate(BaseModel):
    name: str = None

class CustomerResponse(BaseModel):
    CustomerID: int
    Name: str
    JoinDate: datetime
    UserID: int

    class Config:
        orm_mode = True


@router_customer.post("/customers/", response_model=CustomerResponse, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """
    Create a new customer.
    """
    db_customer = customer_model.Customer.get_customer_by_user_id(db, user_id=customer.user_id) # Check if customer already exists for this user
    if db_customer:
        raise HTTPException(status_code=400, detail="Customer profile already exists for this user")
    return customer_model.Customer.create_customer(db, user_id=customer.user_id, name=customer.name, join_date=datetime.utcnow())

@router_customer.get("/customers/{customer_id}", response_model=CustomerResponse)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    Get a customer by ID.
    """
    db_customer = customer_model.Customer.get_customer_by_id(db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer

@router_customer.get("/customers/user/{user_id}", response_model=CustomerResponse)
def read_customer_by_user_id(user_id: int, db: Session = Depends(get_db)):
    """
    Get a customer by User ID.
    """
    db_customer = customer_model.Customer.get_customer_by_user_id(db, user_id=user_id)
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found for this User")
    return db_customer

@router_customer.get("/customers/", response_model=List[CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get all customers.
    """
    customers = customer_model.Customer.get_all_customers(db)
    if not customers:
        raise HTTPException(status_code=404, detail="No customers found") # Or return empty list, depending on desired behavior
    return customers

@router_customer.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """
    Update a customer.
    """
    db_customer = customer_model.Customer.get_customer_by_id(db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer_model.Customer.update_customer(db, customer_id=customer_id, name=customer.name)

@router_customer.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    Delete a customer.
    """
    db_customer = customer_model.Customer.get_customer_by_id(db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer_model.Customer.delete_customer(db, customer_id=customer_id)
