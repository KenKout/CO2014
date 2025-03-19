from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    FeedbackID = Column(Integer, primary_key=True)
    CustomerID = Column(Integer, ForeignKey("customer.CustomerID"))
    Content = Column(String(1000))

    # Relationships
    customer = relationship("Customer", back_populates="feedbacks")