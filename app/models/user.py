from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "user"

    UserID = Column(Integer, primary_key=True)
    Username = Column(String(255))
    Password = Column(String(255))
    Phone = Column(String(20))
    UserType = Column(Enum("customer", "staff"))

    # Relationships
    customers = relationship("Customer", back_populates="user")
    staff = relationship("Staff", back_populates="user")