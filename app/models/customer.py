from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship

from app.database import Base
from fastapi import HTTPException


class Customer(Base):
    __tablename__ = "customer"

    CustomerID = Column(Integer, primary_key=True)
    Name = Column(String(70))
    JoinDate = Column(TIMESTAMP)
    UserID = Column(Integer, ForeignKey("user.UserID"), unique=True) # Add unique=True to enforce one-to-one

    # Relationships
    user = relationship("User", back_populates="customer") # Renamed back_populates to 'customer' (singular)
    bookings = relationship("Booking", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    feedbacks = relationship("Feedback", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")
    training_sessions = relationship("TrainingSession", back_populates="customer")
    enrollments = relationship("Enroll", back_populates="customer")

    @classmethod
    def create_customer(cls, db, user_id: int, name: str, join_date: DateTime):
        """Creates a new customer linked to a user."""
        # Check if a customer already exists for this user
        existing_customer = db.query(cls).filter(cls.UserID == user_id).first()
        if existing_customer:
            raise HTTPException(status_code=400, detail="Customer profile already exists for this user")

        new_customer = cls(
            UserID=user_id,
            Name=name,
            JoinDate=join_date
        )
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        return new_customer

    # ... (rest of the Customer class methods: get_customer_by_id, get_customer_by_name, get_all_customers, update_customer, delete_customer remain mostly the same, but adjust queries if needed to consider UserID)
    @classmethod
    def get_customer_by_id(cls, db, customer_id: int):
        """Retrieves a customer by ID."""
        customer = db.query(cls).filter(cls.CustomerID == customer_id).first()
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    @classmethod
    def get_customer_by_user_id(cls, db, user_id: int):
        """Retrieves a customer by User ID."""
        customer = db.query(cls).filter(cls.UserID == user_id).first()
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found for this User")
        return customer


    @classmethod
    def get_customer_by_name(cls, db, name: str):
        """Retrieves a customer by name."""
        customer = db.query(cls).filter(cls.Name == name).first()
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    @classmethod
    def get_all_customers(cls, db):
        """Retrieves all customers."""
        customers = db.query(cls).all()
        if not customers:
            raise HTTPException(status_code=404, detail="No customers found")
        return customers

    @classmethod
    def update_customer(cls, db, customer_id: int, name: str = None):
        """Updates an existing customer."""
        customer = cls.get_customer_by_id(db, customer_id)
        if name:
            customer.Name = name
        db.commit()
        db.refresh(customer)
        return customer

    @classmethod
    def delete_customer(cls, db, customer_id: int):
        """Deletes a customer."""
        customer = cls.get_customer_by_id(db, customer_id)
        db.delete(customer)
        db.commit()
        return {"detail": "Customer deleted successfully"}