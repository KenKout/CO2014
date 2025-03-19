# Badminton Center Database Models

This directory contains SQLAlchemy ORM models for the badminton center database.

## Overview

The models in this directory represent the database tables for the badminton center management system. They are implemented using SQLAlchemy's declarative syntax and provide an object-oriented interface to interact with the database.

## Database Initialization

The models will automatically create the database tables if they don't exist when the application starts. This is done by calling the `create_tables()` function, which is imported in the main application file.

If you need to manually create the tables, you can run:

```python
from models import create_tables
create_tables()
```

Or directly run the create_tables.py script:

```bash
python -m app.models.create_tables
```

## Using the Models

Here are some examples of how to use these models with SQLAlchemy:

### Querying Data

```python
from app.database import get_db
from models import User, Customer, Court

# Get a database session
db = next(get_db())

# Query all users
users = db.query(User).all()

# Query a specific customer
customer = db.query(Customer).filter(Customer.CustomerID == 1).first()

# Query available courts
available_courts = db.query(Court).filter(Court.Status == True).all()
```

### Creating New Records

```python
from app.database import get_db
from models import User, Customer
from datetime import datetime

# Get a database session
db = next(get_db())

# Create a new user
new_user = User(
    Username="new_user",
    Password="secure_password",
    Phone="123-456-7890",
    UserType="customer"
)
db.add(new_user)
db.commit()
db.refresh(new_user)

# Create a new customer linked to the user
new_customer = Customer(
    Name="John Smith",
    JoinDate=datetime.now(),
    UserID=new_user.UserID
)
db.add(new_customer)
db.commit()
```

### Updating Records

```python
from app.database import get_db
from models import Court

# Get a database session
db = next(get_db())

# Update a court's hourly rate
court = db.query(Court).filter(Court.Court_ID == 1).first()
court.HourRate = 60
db.commit()
```

### Deleting Records

```python
from app.database import get_db
from models import Feedback

# Get a database session
db = next(get_db())

# Delete a feedback entry
feedback = db.query(Feedback).filter(Feedback.FeedbackID == 1).first()
db.delete(feedback)
db.commit()
```

## Model Relationships

The models include relationship definitions that allow you to navigate between related objects. For example:

```python
# Get a customer and their bookings
customer = db.query(Customer).filter(Customer.CustomerID == 1).first()
for booking in customer.bookings:
    print(f"Booking ID: {booking.BookingID}, Court: {booking.court.Court_ID}")

# Get a coach and their training sessions
coach = db.query(Coach).filter(Coach.StaffID == 1).first()
for session in coach.training_sessions:
    print(f"Session ID: {session.SessionID}, Type: {session.Type}")
```

## Database Schema

The models correspond to the following database tables:

- User: Authentication information
- Customer: Customer details linked to users
- Staff: Staff details linked to users
- Coach: Coach specialization extending staff
- Court: Badminton courts with types and rates
- Booking: Court booking records
- Equipment: Equipment inventory for rental
- CafeteriaFood: Food items in the cafeteria
- Order: Order records for various services
- OrderDetails: Detailed line items for orders
- Payment: Payment records for orders
- TrainingSession: Training sessions offered by coaches
- TrainingSchedule: Detailed schedule for training sessions
- Feedback: Customer feedback records
- Enroll: Many-to-many relationship between customers and training sessions
- Rent: Many-to-many relationship between orders and equipment
- OrderFood: Many-to-many relationship between orders and food items