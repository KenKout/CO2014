from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class TrainingSchedule(Base):
    __tablename__ = "trainingschedule"

    SessionID = Column(Integer, ForeignKey("training_session.SessionID"), primary_key=True)
    CourtID = Column(Integer, ForeignKey("court.Court_ID"), primary_key=True)
    StartTime = Column(DateTime)
    EndTime = Column(DateTime)
    DayUse = Column(DateTime)

    # Relationships
    training_session = relationship("TrainingSession", back_populates="schedules")
    court = relationship("Court", back_populates="training_schedules")