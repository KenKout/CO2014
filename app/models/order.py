import pymysql
from fastapi import HTTPException
from loguru import logger
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid # Add uuid for unique payment description

from app.models.enums import BookingStatus, CourtStatus, PaymentStatus, PaymentMethod # Add PaymentMethod
from app.database import get_db

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


def create_payment_entry(order_id: int, customer_id: int, total_amount: float, payment_method: PaymentMethod, db: pymysql.connections.Connection, cursor: pymysql.cursors.DictCursor) -> Dict[str, Any]:
    """Creates an entry in the Payment table with a unique description and specified method."""
    try:
        payment_description = str(uuid.uuid4()) # Generate unique description
        cursor.execute(
            """
            INSERT INTO Payment (OrderID, Total, Customer_ID, Method, Status, Description, Time)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """,
            (order_id, total_amount, customer_id, payment_method.value, PaymentStatus.PENDING.value, payment_description)
        )
        payment_id = cursor.lastrowid
        if not payment_id:
             logger.error(f"Failed to retrieve lastrowid after inserting into Payment for OrderID {order_id}")
             raise HTTPException(status_code=500, detail="Failed to create payment entry")
        logger.info(f"Created Payment entry with ID: {payment_id} for OrderID: {order_id} with Description: {payment_description}")
        return {"payment_id": payment_id, "payment_description": payment_description}
    except pymysql.Error as db_err:
        logger.error(f"Database error creating Payment entry for OrderID {order_id}: {db_err}")
        raise # Re-raise for transaction rollback


# --- Main Order Processing Function ---

def process_order(
    customer_id: int,
    court_orders: Optional[List[Dict[str, Any]]],
    equipment_orders: Optional[List[Dict[str, Any]]],
    food_orders: Optional[List[Dict[str, Any]]],
    payment_method: PaymentMethod, # Add payment_method parameter
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
                    # Decrement equipment stock within the transaction
                    cursor.execute("UPDATE Equipment SET Stock = Stock - 1 WHERE EquipmentID = %s AND Stock > 0", (equip_data['equipment_id'],))
                    if cursor.rowcount == 0:
                        # This means the stock was 0 or the item didn't exist, despite earlier checks.
                        # This could happen due to a race condition.
                        logger.error(f"Failed to decrement stock for EquipmentID {equip_data['equipment_id']} (OrderID: {order_id}). Item might be out of stock.")
                        raise HTTPException(status_code=409, detail=f"Equipment {equip_data['equipment_id']} became unavailable during order processing.")


                # --- Create OrderFood Entries ---
                for food_data in validated_food:
                    create_food_order_entry(
                        order_id=order_id,
                        food_id=food_data['food_id'],
                        db=db,
                        cursor=cursor
                    )
                    # Decrement food stock within the transaction
                    cursor.execute("UPDATE CafeteriaFood SET Stock = Stock - 1 WHERE FoodID = %s AND Stock > 0", (food_data['food_id'],))
                    if cursor.rowcount == 0:
                        # This means the stock was 0 or the item didn't exist.
                        logger.error(f"Failed to decrement stock for FoodID {food_data['food_id']} (OrderID: {order_id}). Item might be out of stock.")
                        raise HTTPException(status_code=409, detail=f"Food item {food_data['food_id']} became unavailable during order processing.")


                # --- Create Payment Entry ---
                payment_details = create_payment_entry(
                    order_id=order_id,
                    customer_id=customer_id,
                    total_amount=total_amount,
                    payment_method=payment_method, # Pass payment method
                    db=db,
                    cursor=cursor
                )

                # --- Commit Transaction ---
                db.commit()
                logger.info(f"Successfully processed and committed OrderID: {order_id} for CustomerID: {customer_id}")
                return {
                    "order_id": order_id,
                    "total_amount": total_amount,
                    "message": "Order placed successfully, pending payment.",
                    "payment_id": payment_details["payment_id"],
                    "payment_description": payment_details["payment_description"]
                }

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
    Retrieves all orders and their details for a given customer, including
    linked training session details if applicable.
    """
    orders_list = []
    try:
        # Use DictCursor to get results as dictionaries
        with db.cursor(pymysql.cursors.DictCursor) as cursor: # Ensure DictCursor is used

            # 1. Fetch all base order details for the customer, JOIN with Session
            # Use aliases (o, ts) for clarity and backticks for safety
            sql_base_orders = """
            SELECT
                `o`.`OrderID`,
                `o`.`OrderDate`,
                `o`.`TotalAmount`,
                `o`.`SessionID` AS `order_session_id`,
                `ts`.`SessionID` AS `session_SessionID`,
                `ts`.`Type` AS `session_Type`,
                `ts`.`StartDate` AS `session_StartDate`,
                `ts`.`EndDate` AS `session_EndDate`,
                `ts`.`Price` AS `session_Price`
            FROM `OrderTable` `o`
            LEFT JOIN `Training_Session` `ts` ON `o`.`SessionID` = `ts`.`SessionID`
            WHERE `o`.`CustomerID` = %s
            ORDER BY `o`.`OrderDate` DESC
            """
            cursor.execute(sql_base_orders, (customer_id,))
            orders_base_data = cursor.fetchall()
            
            logger.debug(f"Fetched base order data for CustomerID {customer_id}: {orders_base_data}")
            # Log specific details for Order #12 if found

            if not orders_base_data:
                return []

            orders_dict: Dict[int, Dict[str, Any]] = {}
            order_ids: List[int] = []

            for base_order in orders_base_data:
                order_id = base_order['OrderID']
                order_ids.append(order_id)

                session_details = None
                if base_order['order_session_id'] is not None and base_order['session_SessionID'] is not None:
                     session_details = {
                         "SessionID": base_order['session_SessionID'],
                         "Type": base_order['session_Type'],
                         "StartDate": base_order['session_StartDate'],
                         "EndDate": base_order['session_EndDate'],
                         "Price": base_order['session_Price']
                     }

                orders_dict[order_id] = {
                    "order_id": order_id,
                    "order_date": base_order['OrderDate'],
                    "total_amount": base_order['TotalAmount'],
                    "bookings": [],
                    "equipment_rentals": [],
                    "food_items": [],
                    "session": session_details
                }

            if not order_ids:
                return []

            # 2. Fetch associated details in batches using IN clause (with backticks)

            # Fetch Bookings
            sql_bookings = """
            SELECT
                `b`.`OrderID`,
                `b`.`BookingID`,
                `b`.`StartTime`,
                `b`.`Endtime`,
                `b`.`Status`,
                `b`.`TotalPrice`,
                `b`.`CourtID` AS `Court_ID`,
                `c`.`Type` AS `CourtType`,
                `c`.`HourRate`
            FROM `Booking` `b`
            JOIN `Court` `c` ON `b`.`CourtID` = `c`.`Court_ID`
            WHERE `b`.`OrderID` IN %s
            """
            cursor.execute(sql_bookings, (order_ids,))
            bookings = cursor.fetchall()
            for booking in bookings:
                oid = booking['OrderID']
                if oid in orders_dict:
                    booking_data = {
                        "BookingID": booking['BookingID'],
                        "StartTime": booking['StartTime'],
                        "Endtime": booking['Endtime'],
                        "Status": booking['Status'],
                        "TotalPrice": booking['TotalPrice'],
                        "Court_ID": booking['Court_ID'],
                        "CourtType": booking['CourtType'],
                        "HourRate": booking['HourRate'],
                    }
                    orders_dict[oid]['bookings'].append(booking_data)


            # Fetch Equipment Rentals
            sql_equipment = """
            SELECT
                `r`.`OrderID`,
                `e`.`EquipmentID`,
                `e`.`Name`,
                `e`.`Brand`,
                `e`.`Type` AS `EquipmentType`,
                `e`.`Price`
            FROM `Rent` `r`
            JOIN `Equipment` `e` ON `r`.`EquipmentID` = `e`.`EquipmentID`
            WHERE `r`.`OrderID` IN %s
            """
            cursor.execute(sql_equipment, (order_ids,))
            equipment_rentals = cursor.fetchall()
            for rental in equipment_rentals:
                 oid = rental['OrderID']
                 if oid in orders_dict:
                    rental_data = {
                        "EquipmentID": rental['EquipmentID'],
                        "Name": rental['Name'],
                        "Brand": rental['Brand'],
                        "EquipmentType": rental['EquipmentType'],
                        "Price": rental['Price'],
                    }
                    orders_dict[oid]['equipment_rentals'].append(rental_data)

            # Fetch Food Items (Corrected Query)
            sql_food = """
            SELECT
                `of`.`OrderID`,
                `cf`.`FoodID`,
                `cf`.`Name`,
                `cf`.`Category` AS `FoodCategory`,
                `cf`.`Price`
            FROM `OrderFood` `of`
            JOIN `CafeteriaFood` `cf` ON `of`.`FoodID` = `cf`.`FoodID`
            WHERE `of`.`OrderID` IN %s
            """
            # ^-- Added backticks around table names (`OrderFood`, `CafeteriaFood`),
            #     aliases (`of`, `cf`), and potentially ambiguous column names.
            cursor.execute(sql_food, (order_ids,))
            food_items = cursor.fetchall()
            for food in food_items:
                oid = food['OrderID']
                if oid in orders_dict:
                    food_data = {
                        "FoodID": food['FoodID'],
                        "Name": food['Name'],
                        "FoodCategory": food['FoodCategory'],
                        "Price": food['Price'],
                    }
                    orders_dict[oid]['food_items'].append(food_data)

            orders_list = list(orders_dict.values())
        return orders_list

    except pymysql.Error as db_err:
        logger.error(f"Database error fetching orders for CustomerID {customer_id}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error retrieving order history.")
    except Exception as e:
        logger.exception(f"Unexpected error fetching orders for CustomerID {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving order history.")
