from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Staff(Base):
    __tablename__ = "staff"

    StaffID = Column(Integer, primary_key=True)
    UserID = Column(Integer, ForeignKey("user.UserID"))
    Salary = Column(Integer)
    HiredDate = Column(DateTime)
    Name = Column(String(255))

    # Relationships
    user = relationship("User", back_populates="staff")
    coach = relationship("Coach", back_populates="staff", uselist=False)