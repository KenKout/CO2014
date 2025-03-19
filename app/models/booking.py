from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Booking(Base):
    __tablename__ = "booking"

    BookingID = Column(Integer, primary_key=True)
    CustomerID = Column(Integer, ForeignKey("customer.CustomerID"))
    CourtID = Column(Integer, ForeignKey("court.Court_ID"))
    Date = Column(DateTime)
    StartTime = Column(DateTime)
    Endtime = Column(DateTime)  # Note: This matches the case in the SQL dump
    Status = Column(Boolean)
    TotalPrice = Column(Integer)
    OrderID = Column(Integer, ForeignKey("order.OrderID"))

    # Relationships
    customer = relationship("Customer", back_populates="bookings")
    court = relationship("Court", back_populates="bookings")
    order = relationship("Order", back_populates="bookings")