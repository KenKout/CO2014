from sqlalchemy import Column, Integer, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class OrderDetails(Base):
    __tablename__ = "orderdetails"

    Index = Column(Integer, primary_key=True)
    OrderID = Column(Integer, ForeignKey("order.OrderID"))
    ItemType = Column(Enum("court", "equipment", "food", "training"))
    Quantity = Column(Integer)
    UnitPrice = Column(Integer)

    # Relationships
    order = relationship("Order", back_populates="order_details")