from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Order(Base):
    __tablename__ = "order"

    OrderID = Column(Integer, primary_key=True)
    PaymentID = Column(Integer)
    OrderDate = Column(DateTime)
    TotalAmount = Column(Integer)
    CustomerID = Column(Integer, ForeignKey("customer.CustomerID"))
    BookingID = Column(Integer)

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    bookings = relationship("Booking", back_populates="order")
    order_details = relationship("OrderDetails", back_populates="order")
    payments = relationship("Payment", back_populates="order")
    training_sessions = relationship("TrainingSession", back_populates="order")
    food_orders = relationship("OrderFood", back_populates="order")
    equipment_rentals = relationship("Rent", back_populates="order")