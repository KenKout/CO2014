import pymysql
from fastapi import HTTPException
from loguru import logger
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.enums import BookingStatus, CourtStatus
from app.database import get_db # Assuming get_db is correctly set up

# --- Helper Functions to Fetch Item Details and Prices ---

def get_court_details(court_id: int, start_time: datetime, end_time: datetime, db: pymysql.connections.Connection) -> Optional[Dict[str, Any]]:
    """Fetches court details including price if available for the given time."""
    try:
        with db.cursor() as cursor:
            # Check for existing bookings that overlap
            cursor.execute(
                """
                SELECT BookingID FROM Booking
                WHERE CourtID = %s AND Status != %s AND (
                    (%s < Endtime AND %s > StartTime)
                )
                """,
                (court_id, BookingStatus.CANCEL.value, start_time, end_time)
            )
            overlapping_booking = cursor.fetchone()
            if overlapping_booking:
                logger.warning(f"Court {court_id} is already booked during the requested time.")
                return None # Court is booked

            # Fetch court details and hourly rate
            cursor.execute(
                "SELECT Court_ID, HourRate, Status FROM Court WHERE Court_ID = %s",
                (court_id,)
            )
            court = cursor.fetchone()
            if not court:
                logger.warning(f"Court with ID {court_id} not found.")
                return None # Court not found
            if court['Status'] == CourtStatus.BOOKED.value: # Check general status just in case
                 logger.warning(f"Court {court_id} status is currently '{CourtStatus.BOOKED.value}'.")
                 return None # Court is marked as booked

            # Calculate duration and price
            duration_hours = (end_time - start_time).total_seconds() / 3600
            if duration_hours <= 0:
                 logger.warning(f"Invalid booking duration for court {court_id}: start={start_time}, end={end_time}")
                 return None # Invalid duration

            price = court['HourRate'] * duration_hours
            return {"Court_ID": court['Court_ID'], "Price": price}

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching court details for ID {court_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error checking court availability")
    except Exception as e:
        logger.exception(f"Unexpected error fetching court details for ID {court_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error checking court availability")


def get_equipment_details(equipment_id: int, db: pymysql.connections.Connection) -> Optional[Dict[str, Any]]:
    """Fetches equipment details including price if in stock."""
    try:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT EquipmentID, Price, Stock FROM Equipment WHERE EquipmentID = %s",
                (equipment_id,)
            )
            equipment = cursor.fetchone()
            if not equipment:
                logger.warning(f"Equipment with ID {equipment_id} not found.")
                return None
            if equipment['Stock'] <= 0:
                logger.warning(f"Equipment with ID {equipment_id} is out of stock.")
                return None
            return {"EquipmentID": equipment['EquipmentID'], "Price": equipment['Price']}
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching equipment details for ID {equipment_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error checking equipment stock")
    except Exception as e:
        logger.exception(f"Unexpected error fetching equipment details for ID {equipment_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error checking equipment stock")


def get_food_details(food_id: int, db: pymysql.connections.Connection) -> Optional[Dict[str, Any]]:
    """Fetches food details including price if in stock."""
    try:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT FoodID, Price, Stock FROM CafeteriaFood WHERE FoodID = %s",
                (food_id,)
            )
            food = cursor.fetchone()
            if not food:
                logger.warning(f"Food item with ID {food_id} not found.")
                return None
            if food['Stock'] <= 0:
                logger.warning(f"Food item with ID {food_id} is out of stock.")
                return None
            return {"FoodID": food['FoodID'], "Price": food['Price']}
    except pymysql.Error as db_err:
        logger.error(f"Database error fetching food details for ID {food_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error checking food stock")
    except Exception as e:
        logger.exception(f"Unexpected error fetching food details for ID {food_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error checking food stock")


# --- Functions to Create Order and Related Entries ---

def create_order_table_entry(customer_id: int, total_amount: float, db: pymysql.connections.Connection, cursor: pymysql.cursors.DictCursor) -> int:
    """Creates an entry in OrderTable and returns the new OrderID."""
    try:
        cursor.execute(
            "INSERT INTO OrderTable (OrderDate, TotalAmount, CustomerID) VALUES (NOW(), %s, %s)",
            (total_amount, customer_id)
        )
        order_id = cursor.lastrowid
        if not order_id:
             logger.error(f"Failed to retrieve lastrowid after inserting into OrderTable for customer {customer_id}")
             raise HTTPException(status_code=500, detail="Failed to create order entry")
        logger.info(f"Created OrderTable entry with ID: {order_id} for customer {customer_id}")
        return order_id
    except pymysql.Error as db_err:
        logger.error(f"Database error creating OrderTable entry for customer {customer_id}: {db_err}")
        raise # Re-raise to be caught by the main transaction handler


def create_booking_entry(order_id: int, customer_id: int, court_id: int, start_time: datetime, end_time: datetime, price: float, db: pymysql.connections.Connection, cursor: pymysql.cursors.DictCursor):
    """Creates an entry in the Booking table (relies on BookingID AUTO_INCREMENT)."""
    try:
        cursor.execute(
            """
            INSERT INTO Booking (CustomerID, CourtID, StartTime, Endtime, Status, TotalPrice, OrderID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (customer_id, court_id, start_time, end_time, BookingStatus.PENDING.value, price, order_id)
        )
        # Log the booking ID for debugging
        booking_id = cursor.lastrowid
        logger.info(f"Created Booking entry with ID {booking_id} for OrderID {order_id}, CourtID {court_id}")
        logger.info(f"Created Booking entry for OrderID {order_id}, CourtID {court_id}")
    except pymysql.Error as db_err:
        logger.error(f"Database error creating Booking entry for OrderID {order_id}, CourtID {court_id}: {db_err}")
        raise # Re-raise for transaction rollback


def create_rental_entry(order_id: int, equipment_id: int, db: pymysql.connections.Connection, cursor: pymysql.cursors.DictCursor):
    """Creates an entry in the Rent table."""
    try:
        cursor.execute(
            "INSERT INTO Rent (OrderID, EquipmentID) VALUES (%s, %s)",
            (order_id, equipment_id)
        )
        # Decrement stock (Optional: Could be done here or via triggers)
        # cursor.execute("UPDATE Equipment SET Stock = Stock - 1 WHERE EquipmentID = %s", (equipment_id,))
        logger.info(f"Created Rent entry for OrderID {order_id}, EquipmentID {equipment_id}")
    except pymysql.Error as db_err:
        logger.error(f"Database error creating Rent entry for OrderID {order_id}, EquipmentID {equipment_id}: {db_err}")
        raise # Re-raise for transaction rollback


def create_food_order_entry(order_id: int, food_id: int, db: pymysql.connections.Connection, cursor: pymysql.cursors.DictCursor):
    """Creates an entry in the OrderFood table."""
    try:
        cursor.execute(
            "INSERT INTO OrderFood (OrderID, FoodID) VALUES (%s, %s)",
            (order_id, food_id)
        )
         # Decrement stock (Optional: Could be done here or via triggers)
        # cursor.execute("UPDATE CafeteriaFood SET Stock = Stock - 1 WHERE FoodID = %s", (food_id,))
        logger.info(f"Created OrderFood entry for OrderID {order_id}, FoodID {food_id}")
    except pymysql.Error as db_err:
        logger.error(f"Database error creating OrderFood entry for OrderID {order_id}, FoodID {food_id}: {db_err}")
        raise # Re-raise for transaction rollback


# --- Main Order Processing Function ---

def process_order(
    customer_id: int,
    court_orders: Optional[List[Dict[str, Any]]],
    equipment_orders: Optional[List[Dict[str, Any]]],
    food_orders: Optional[List[Dict[str, Any]]],
    db: pymysql.connections.Connection
) -> Dict[str, Any]:
    """
    Processes a complete order:
    1. Validates items and calculates total price.
    2. Creates OrderTable entry.
    3. Creates Booking, Rent, OrderFood entries.
    4. Handles the entire process within a database transaction.
    """
    total_amount = 0.0
    validated_courts = []
    validated_equipment = []
    validated_food = []

    try:
        # --- 1. Validation and Price Calculation ---
        if court_orders:
            for order in court_orders:
                court_id = order.get('court_id')
                start_time = order.get('start_time')
                end_time = order.get('end_time')
                if not all([court_id, start_time, end_time]):
                    raise HTTPException(status_code=400, detail="Missing court booking details (court_id, start_time, end_time)")

                details = get_court_details(court_id, start_time, end_time, db)
                if not details:
                    raise HTTPException(status_code=400, detail=f"Court {court_id} is unavailable or invalid for the requested time.")
                total_amount += details['Price']
                validated_courts.append({**order, "price": details['Price']}) # Store details needed for insertion

        if equipment_orders:
            for order in equipment_orders:
                equipment_id = order.get('equipment_id')
                # quantity = order.get('quantity', 1) # Assuming quantity 1 for now
                if not equipment_id:
                     raise HTTPException(status_code=400, detail="Missing equipment rental details (equipment_id)")

                details = get_equipment_details(equipment_id, db)
                if not details:
                    raise HTTPException(status_code=400, detail=f"Equipment {equipment_id} is unavailable or out of stock.")
                total_amount += details['Price'] # * quantity
                validated_equipment.append(order) # Store details needed for insertion

        if food_orders:
            for order in food_orders:
                food_id = order.get('food_id')
                # quantity = order.get('quantity', 1) # Assuming quantity 1 for now
                if not food_id:
                     raise HTTPException(status_code=400, detail="Missing food order details (food_id)")

                details = get_food_details(food_id, db)
                if not details:
                    raise HTTPException(status_code=400, detail=f"Food item {food_id} is unavailable or out of stock.")
                total_amount += details['Price'] # * quantity
                validated_food.append(order) # Store details needed for insertion

        if total_amount <= 0 and not (validated_courts or validated_equipment or validated_food):
             raise HTTPException(status_code=400, detail="Order cannot be empty.")

        # --- 2. Database Transaction ---
        with db.cursor() as cursor:
            try:
                # --- Create OrderTable Entry ---
                order_id = create_order_table_entry(customer_id, total_amount, db, cursor)

                # --- Create Booking Entries ---
                for court_data in validated_courts:
                    create_booking_entry(
                        order_id=order_id,
                        customer_id=customer_id,
                        court_id=court_data['court_id'],
                        start_time=court_data['start_time'],
                        end_time=court_data['end_time'],
                        price=court_data['price'],
                        db=db,
                        cursor=cursor
                    )

                # --- Create Rent Entries ---
                for equip_data in validated_equipment:
                    create_rental_entry(
                        order_id=order_id,
                        equipment_id=equip_data['equipment_id'],
                        db=db,
                        cursor=cursor
                    )
                    # Optional: Decrement stock here if not using triggers
                    # cursor.execute("UPDATE Equipment SET Stock = Stock - 1 WHERE EquipmentID = %s", (equip_data['equipment_id'],))


                # --- Create OrderFood Entries ---
                for food_data in validated_food:
                    create_food_order_entry(
                        order_id=order_id,
                        food_id=food_data['food_id'],
                        db=db,
                        cursor=cursor
                    )
                    # Optional: Decrement stock here if not using triggers
                    # cursor.execute("UPDATE CafeteriaFood SET Stock = Stock - 1 WHERE FoodID = %s", (food_data['food_id'],))


                # --- Commit Transaction ---
                db.commit()
                logger.info(f"Successfully processed and committed OrderID: {order_id} for CustomerID: {customer_id}")
                return {"order_id": order_id, "total_amount": total_amount, "message": "Order placed successfully"}

            except (pymysql.Error, HTTPException) as e:
                db.rollback()
                logger.error(f"Transaction rolled back for CustomerID {customer_id} due to error: {e}")
                if isinstance(e, HTTPException):
                    raise e # Re-raise HTTP exceptions from validation/creation steps
                else:
                    raise HTTPException(status_code=500, detail="Failed to process order due to a database error.")
            except Exception as e:
                 db.rollback()
                 logger.exception(f"Unexpected error during order transaction for CustomerID {customer_id}: {e}")
                 raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the order.")

    except HTTPException as e:
        # Catch validation errors before transaction starts
        logger.warning(f"Order validation failed for CustomerID {customer_id}: {e.detail}")
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error during order validation/calculation for CustomerID {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred before processing the order.")
# --- Function to Retrieve User Orders ---

def get_user_orders(customer_id: int, db: pymysql.connections.Connection) -> List[Dict[str, Any]]:
    """
    Retrieves all orders and their details for a given customer.
    """
    orders_list = []
    try:
        with db.cursor() as cursor:
            # 1. Fetch all orders for the customer
            cursor.execute(
                "SELECT OrderID, OrderDate, TotalAmount FROM OrderTable WHERE CustomerID = %s ORDER BY OrderDate DESC",
                (customer_id,)
            )
            orders = cursor.fetchall()
            if not orders:
                return [] # No orders found for this customer

            # 2. For each order, fetch associated details
            for order in orders:
                order_id = order['OrderID']
                order_details = {
                    "order_id": order_id,
                    "order_date": order['OrderDate'],
                    "total_amount": order['TotalAmount'],
                    "bookings": [],
                    "equipment_rentals": [],
                    "food_items": []
                }

                # Fetch Bookings associated with the order
                cursor.execute(
                    """
                    SELECT
                        b.BookingID, b.StartTime, b.Endtime, b.Status, b.TotalPrice,
                        c.Court_ID, c.Type as CourtType, c.HourRate
                    FROM Booking b
                    JOIN Court c ON b.CourtID = c.Court_ID
                    WHERE b.OrderID = %s AND b.CustomerID = %s
                    """,
                    (order_id, customer_id)
                )
                bookings = cursor.fetchall()
                order_details["bookings"] = bookings

                # Fetch Equipment Rentals associated with the order
                cursor.execute(
                    """
                    SELECT
                        r.EquipmentID, e.Name, e.Brand, e.Type as EquipmentType, e.Price
                    FROM Rent r
                    JOIN Equipment e ON r.EquipmentID = e.EquipmentID
                    WHERE r.OrderID = %s
                    """,
                    (order_id,)
                )
                equipment_rentals = cursor.fetchall()
                order_details["equipment_rentals"] = equipment_rentals

                # Fetch Food Items associated with the order
                cursor.execute(
                    """
                    SELECT
                        `of`.`FoodID`, `cf`.`Name`, `cf`.`Category` as FoodCategory, `cf`.`Price`
                    FROM `OrderFood` `of`
                    JOIN `CafeteriaFood` `cf` ON `of`.`FoodID` = `cf`.`FoodID`
                    WHERE `of`.`OrderID` = %s
                    """,
                    (order_id,)
                )
                food_items = cursor.fetchall()
                order_details["food_items"] = food_items

                orders_list.append(order_details)

        return orders_list

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching orders for CustomerID {customer_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error retrieving order history.")
    except Exception as e:
        logger.exception(f"Unexpected error fetching orders for CustomerID {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving order history.")