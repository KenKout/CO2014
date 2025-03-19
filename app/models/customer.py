from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Customer(Base):
    __tablename__ = "customer"

    CustomerID = Column(Integer, primary_key=True)
    Name = Column(String(255))
    JoinDate = Column(DateTime)
    UserID = Column(Integer, ForeignKey("user.UserID"))

    # Relationships
    user = relationship("User", back_populates="customers")
    bookings = relationship("Booking", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    feedbacks = relationship("Feedback", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")
    training_sessions = relationship("TrainingSession", back_populates="customer")
    enrollments = relationship("Enroll", back_populates="customer")