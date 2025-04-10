from sqlalchemy import Column, Integer, String,  ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship

from app.database import Base


class Staff(Base):
    __tablename__ = "staff"

    StaffID = Column(Integer, primary_key=True)
    UserID = Column(Integer, ForeignKey("user.UserID"))
    Salary = Column(Integer)
    HiredDate = Column(TIMESTAMP)
    Name = Column(String(100))

    # Relationships
    user = relationship("User", back_populates="staff")
    coach = relationship("Coach", back_populates="staff", uselist=False)