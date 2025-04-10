from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class CafeteriaFood(Base):
    __tablename__ = "cafeteriafood"

    FoodID = Column(Integer, primary_key=True)
    Stock = Column(Integer)
    Name = Column(String(100))
    Category = Column(Enum("drinks", "snacks", "meals"))
    Price = Column(Integer)

    # Relationships
    order_foods = relationship("OrderFood", back_populates="food")