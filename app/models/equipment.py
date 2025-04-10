from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    EquipmentID = Column(Integer, primary_key=True)
    Price = Column(Integer)
    Type = Column(Enum("racket", "shoes", "clothes"), nullable=False)
    Status = Column(Enum("available", "unavailable"), nullable=False)
    Stock = Column(Integer)
    Name = Column(String(255))
    Brand = Column(String(255))

    # Relationships
    rentals = relationship("Rent", back_populates="equipment")