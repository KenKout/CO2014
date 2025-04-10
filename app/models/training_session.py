from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class TrainingSession(Base):
    __tablename__ = "training_session"

    SessionID = Column(Integer, primary_key=True)
    StartDate = Column(TIMESTAMP)
    EndDate = Column(TIMESTAMP)
    CoachID = Column(Integer, ForeignKey("coach.StaffID"))
    CourtID = Column(Integer, ForeignKey("court.Court_ID"))
    CustomerID = Column(Integer, ForeignKey("customer.CustomerID"))
    OrderID = Column(Integer, ForeignKey("order.OrderID"))
    Schedule = Column(String(255))
    Type = Column(Enum("beginner", "intermediate"))
    Price = Column(Integer)

    # Relationships
    coach = relationship("Coach", back_populates="training_sessions")
    court = relationship("Court", back_populates="training_sessions")
    customer = relationship("Customer", back_populates="training_sessions")
    order = relationship("Order", back_populates="training_sessions")
    enrollments = relationship("Enroll", back_populates="training_session")
    schedules = relationship("TrainingSchedule", back_populates="training_session")