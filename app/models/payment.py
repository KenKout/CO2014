from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payment"

    PaymentID = Column(Integer, primary_key=True)
    OrderID = Column(Integer, ForeignKey("order.OrderID"))
    Date = Column(DateTime)
    Total = Column(Integer)
    Customer_ID = Column(Integer, ForeignKey("customer.CustomerID"))
    Method = Column(Enum("cash", "banking", "card"))
    Time = Column(DateTime)

    # Relationships
    order = relationship("Order", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")