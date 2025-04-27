from enum import Enum

class UserType(str, Enum):
    CUSTOMER = "Customer"
    STAFF = "Staff"

class CourtStatus(str, Enum):
    AVAILABLE = "Available"
    BOOKED = "Booked"

class CourtType(str, Enum):
    NORMAL = "Normal"
    AIR_CONDITIONER = "Air-conditioner"

class BookingStatus(str, Enum):
    PENDING = "Pending"
    SUCCESS = "Success"
    CANCEL = "Cancel"

class PaymentStatus(str, Enum):
    PENDING = "Pending"
    SUCCESS = "Success"
    CANCEL = "Cancel"

class PaymentMethod(str, Enum):
    CREDIT_CARD = "Credit Card"
    CASH = "Cash"

class TrainingSessionType(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"

class TrainingSessionStatus(str, Enum):
    AVAILABLE = "Available"
    UNAVAILABLE = "Unavailable"

class FeedbackType(str, Enum):
    COURT = "Court"
    SESSION = "Session"

class FoodCategory(str, Enum):
    SNACK = "Snack"
    MEAL = "Meal"
    DRINK = "Drink"

class EquipmentType(str, Enum):
    RACKET = "Racket"
    SHUTTLECOCK = "Shuttlecock"
    SHOES = "Shoes"