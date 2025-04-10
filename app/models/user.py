from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "user"

    UserID = Column(Integer, primary_key=True)
    Username = Column(String(50), unique=True, nullable=False)
    Password = Column(String(50), nullable=False)
    Phone = Column(String(10), nullable=False)
    UserType = Column(Enum("customer", "staff"), nullable=False)

    # Relationships
    customers = relationship("Customer", back_populates="user")
    staff = relationship("Staff", back_populates="user")
