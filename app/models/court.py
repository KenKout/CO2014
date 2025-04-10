from sqlalchemy import Column, Integer, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class Court(Base):
    __tablename__ = "court"

    Court_ID = Column(Integer, primary_key=True)
    Status = Column(Enum("available", "unavailable"), nullable=False)
    HourRate = Column(Integer, nullable=False)
    Type = Column(Enum("normal", "air-conditioner"))

    # Relationships
    bookings = relationship("Booking", back_populates="court")
    training_sessions = relationship("TrainingSession", back_populates="court")
    training_schedules = relationship("TrainingSchedule", back_populates="court")