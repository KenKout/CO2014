from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Coach(Base):
    __tablename__ = "coach"

    StaffID = Column(Integer, ForeignKey("staff.StaffID"), primary_key=True)
    Expereience = Column(String(255))  # Note: This matches the typo in the SQL dump
    Rating = Column(Numeric(3, 2))

    # Relationships
    staff = relationship("Staff", back_populates="coach")
    training_sessions = relationship("TrainingSession", back_populates="coach")