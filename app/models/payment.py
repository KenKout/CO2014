from sqlalchemy import Column, Integer,  Enum, ForeignKey,  TIMESTAMP
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payment"

    PaymentID = Column(Integer, primary_key=True,nullable=False)
    OrderID = Column(Integer, ForeignKey("order.OrderID"), nullable=False)
    Date = Column(TIMESTAMP, nullable=False)
    Total = Column(Integer, nullable=False)
    Customer_ID = Column(Integer, ForeignKey("customer.CustomerID"), nullable=False)
    Method = Column(Enum("cash", "banking", "card"), nullable=False)  # 0: cash, 1: banking, 2: card
    Time = Column(TIMESTAMP)

    # Relationships
    order = relationship("Order", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")