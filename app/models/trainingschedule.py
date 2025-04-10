from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class TrainingSchedule(Base):
    __tablename__ = "trainingschedule"

    SessionID = Column(Integer, ForeignKey("training_session.SessionID"), primary_key=True)
    CourtID = Column(Integer, ForeignKey("court.Court_ID"), primary_key=True)
    StartTime = Column(TIMESTAMP)
    EndTime = Column(TIMESTAMP)
    DayUse = Column(TIMESTAMP)

    # Relationships
    training_session = relationship("TrainingSession", back_populates="schedules")
    court = relationship("Court", back_populates="training_schedules")