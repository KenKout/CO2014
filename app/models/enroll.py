from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Enroll(Base):
    __tablename__ = "enroll"

    CustomerID = Column(Integer, ForeignKey("customer.CustomerID"), primary_key=True)
    SessionID = Column(Integer, ForeignKey("training_session.SessionID"), primary_key=True)

    # Relationships
    customer = relationship("Customer", back_populates="enrollments")
    training_session = relationship("TrainingSession", back_populates="enrollments")