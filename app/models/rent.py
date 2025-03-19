from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Rent(Base):
    __tablename__ = "rent"

    OrderID = Column(Integer, ForeignKey("order.OrderID"), primary_key=True)
    EquipmentID = Column(Integer, ForeignKey("equipment.EquipmentID"), primary_key=True)

    # Relationships
    order = relationship("Order", back_populates="equipment_rentals")
    equipment = relationship("Equipment", back_populates="rentals")