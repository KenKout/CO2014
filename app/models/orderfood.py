from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class OrderFood(Base):
    __tablename__ = "orderfood"

    OrderID = Column(Integer, ForeignKey("order.OrderID"), primary_key=True)
    FoodID = Column(Integer, ForeignKey("cafeteriafood.FoodID"), primary_key=True)

    # Relationships
    order = relationship("Order", back_populates="food_orders")
    food = relationship("CafeteriaFood", back_populates="order_foods")