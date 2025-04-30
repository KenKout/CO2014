-- User Table
CREATE TABLE `User` (
    `Username` VARCHAR(255) PRIMARY KEY,
    `Password` VARCHAR(255),
    `Phone` VARCHAR(20),
    `UserType` ENUM('Customer', 'Staff'),
    `JoinDate` DATETIME
);

-- Customer Table
CREATE TABLE `Customer` (
    `CustomerID` INT PRIMARY KEY AUTO_INCREMENT,
    `Name` VARCHAR(100),
    `Date_of_Birth` DATETIME,
    `Username` VARCHAR(100),
    FOREIGN KEY (`Username`) REFERENCES `User`(`Username`)
);

-- Staff Table  
CREATE TABLE `Staff` (
    `StaffID` INT PRIMARY KEY AUTO_INCREMENT,
    `Username` VARCHAR(100),
    `Name` VARCHAR(100),
    `Salary` INT,
    FOREIGN KEY (`Username`) REFERENCES `User`(`Username`)
);

-- Coach Table
CREATE TABLE `Coach` (
    `StaffID` INT,
    `Description` TEXT,
    `url` TEXT,
    FOREIGN KEY (`StaffID`) REFERENCES `Staff`(`StaffID`)
);

-- Court Table
CREATE TABLE `Court` (
    `Court_ID` INT PRIMARY KEY AUTO_INCREMENT,
    `Status` ENUM('Available', 'Booked'),
    `HourRate` INT,
    `Type` ENUM('Normal', 'Air-conditioner')
);

-- Training Session Table
CREATE TABLE `Training_Session` (
    `SessionID` INT PRIMARY KEY AUTO_INCREMENT,
    `StartDate` DATETIME,
    `EndDate` DATETIME,
    `CoachID` INT,
    `CourtID` INT,
    `Schedule` VARCHAR(255),
    `Type` ENUM('Beginner', 'Intermediate', 'Advanced'),
    `Status` ENUM('Available', 'Unavailable'),
    `Price` INT,
    `Rating` DECIMAL(2,1),
    `Max_Students` INT,
    FOREIGN KEY (`CoachID`) REFERENCES `Coach`(`StaffID`),
    FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`)
);

-- OrderTable Table
CREATE TABLE `OrderTable` (
    `OrderID` INT PRIMARY KEY AUTO_INCREMENT,
    `OrderDate` DATETIME,
    `TotalAmount` INT,
    `CustomerID` INT,
    `SessionID` INT,
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
    FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`)
);

-- Booking Table
CREATE TABLE `Booking` (
    `BookingID` INT PRIMARY KEY AUTO_INCREMENT,
    `CustomerID` INT,
    `CourtID` INT,
    `StartTime` DATETIME,
    `Endtime` DATETIME,
    `Status` ENUM('Pending', 'Success', 'Cancel'),
    `TotalPrice` INT,
    `OrderID` INT,
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
    FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
    FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`)
);

-- Payment Table
CREATE TABLE `Payment` (
    `PaymentID` INT PRIMARY KEY AUTO_INCREMENT,
    `OrderID` INT,
    `Total` INT,
    `Customer_ID` INT,
    `Method` ENUM('Credit Card', 'Cash'),
    `Status` ENUM('Pending', 'Success', 'Cancel'),
    `Description` TEXT,
    `Time` DATETIME,
    FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
    FOREIGN KEY (`Customer_ID`) REFERENCES `Customer`(`CustomerID`)
);

-- CafeteriaFood Table
CREATE TABLE `CafeteriaFood` (
    `FoodID` INT PRIMARY KEY AUTO_INCREMENT,
    `Stock` INT,
    `Name` VARCHAR(255),
    `Category` ENUM('Snack', 'Meal', 'Drink'),
    `Price` INT,
    `url` TEXT
);

-- Equipment Table
CREATE TABLE `Equipment` (
    `EquipmentID` INT PRIMARY KEY AUTO_INCREMENT,
    `Price` INT,
    `Type` ENUM('Racket', 'Shuttlecock', 'Shoes'),
    `Stock` INT,
    `Name` VARCHAR(255),
    `Brand` VARCHAR(100),
    `url` TEXT
);

-- Enroll Table
CREATE TABLE `Enroll` (
    `CustomerID` INT,
    `SessionID` INT,
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
    FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`),
    PRIMARY KEY (`CustomerID`, `SessionID`)
);

-- TrainingSchedule Table
CREATE TABLE `TrainingSchedule` (
    `SessionID` INT,
    `CourtID` INT,
    `StartTime` DATETIME,
    `EndTime` DATETIME,
    FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`),
    FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
    PRIMARY KEY (`SessionID`, `CourtID`, `StartTime`)
);

-- Rent Table
CREATE TABLE `Rent` (
    `OrderID` INT,
    `EquipmentID` INT,
    FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
    FOREIGN KEY (`EquipmentID`) REFERENCES `Equipment`(`EquipmentID`),
    PRIMARY KEY (`OrderID`, `EquipmentID`)
);

-- OrderFood Table
CREATE TABLE `OrderFood` (
    `OrderID` INT,
    `FoodID` INT,
    FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
    FOREIGN KEY (`FoodID`) REFERENCES `CafeteriaFood`(`FoodID`),
    PRIMARY KEY (`OrderID`, `FoodID`)
);

-- Feedback Table
CREATE TABLE `FeedBack` (
    `FeedbackID` INT PRIMARY KEY AUTO_INCREMENT,
    `CustomerID` INT,
    `Content` TEXT,
    `Title` VARCHAR(255),
    `ON` ENUM('Court', 'Session'),
    `Rate` INT,
    `CourtID` INT,
    `SessionID` INT,
    `OrderID` INT,
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
    FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
    FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`),
    FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`)
);


-- Procedure to get all food items call using : CALL GetAllCafeteriaFood()
DELIMITER //

CREATE PROCEDURE GetAllCafeteriaFood()
BEGIN
    SELECT * FROM CafeteriaFood;
END //

DELIMITER ;
-- Procedure to get all equipment items call using: CALL GetAllEquipment()
DELIMITER //

CREATE PROCEDURE GetAllEquipment()
BEGIN
    SELECT EquipmentID, Price, Type, Stock, Name, Brand, url
                FROM Equipment;
END //

DELIMITER ;


-- Trigger to automatically change the session status to 'Unavailable' when the max students are reached


DELIMITER //

CREATE TRIGGER after_enroll_insert
AFTER INSERT ON Enroll
FOR EACH ROW
BEGIN
    -- Declare variables to hold the current enrollment count and the max limit
    DECLARE current_enrollment_count INT;
    DECLARE max_students_limit INT;

    -- Get the current number of students enrolled in the session that was just enrolled into
    SELECT COUNT(*) INTO current_enrollment_count
    FROM Enroll
    WHERE SessionID = NEW.SessionID; -- NEW.SessionID refers to the SessionID of the newly inserted row

    -- Get the maximum number of students allowed for this session
    SELECT Max_Students INTO max_students_limit
    FROM Training_Session
    WHERE SessionID = NEW.SessionID;

    -- Check if the current enrollment count equals the maximum limit
    IF current_enrollment_count = max_students_limit THEN
        -- If it does, update the status of the training session to 'Unavailable'
        UPDATE Training_Session
        SET Status = 'Unavailable'
        WHERE SessionID = NEW.SessionID;
    END IF;
END //

DELIMITER ;

-- Trigger to automatically chang the rating of the session when a feedback is added on session

DELIMITER $$

-- Trigger to update session rating after a new feedback is inserted
CREATE TRIGGER trg_FeedBack_AfterInsert_UpdateSessionRating
AFTER INSERT ON FeedBack
FOR EACH ROW
BEGIN
    -- Check if the feedback is for a Session and a SessionID is provided
    IF NEW.`ON` = 'Session' AND NEW.SessionID IS NOT NULL THEN -- Added backticks here
        -- Calculate the average rating for this session and update the Training_Session table
        UPDATE Training_Session
        SET Rating = (SELECT AVG(Rate) FROM FeedBack WHERE `ON` = 'Session' AND SessionID = NEW.SessionID) -- Added backticks here
        WHERE SessionID = NEW.SessionID;
    END IF;
END$$

-- Trigger to update session rating after a feedback is updated
CREATE TRIGGER trg_FeedBack_AfterUpdate_UpdateSessionRating
AFTER UPDATE ON FeedBack
FOR EACH ROW
BEGIN
    -- Check if the OLD feedback was for a Session and a SessionID was provided.
    -- If so, recalculate the rating for the OLD session (in case the session changed or feedback is no longer 'Session').
    IF OLD.`ON` = 'Session' AND OLD.SessionID IS NOT NULL THEN -- Added backticks here
        UPDATE Training_Session
        SET Rating = (SELECT AVG(Rate) FROM FeedBack WHERE `ON` = 'Session' AND SessionID = OLD.SessionID) -- Added backticks here
        WHERE SessionID = OLD.SessionID;
    END IF;

    -- Check if the NEW feedback is for a Session and a SessionID is provided.
    -- If so, recalculate the rating for the NEW session. This handles:
    -- 1. Rating change on the same session.
    -- 2. Feedback changing from 'Court' to 'Session'.
    -- 3. Feedback changing from one SessionID to another.
    IF NEW.`ON` = 'Session' AND NEW.SessionID IS NOT NULL THEN -- Added backticks here
        UPDATE Training_Session
        SET Rating = (SELECT AVG(Rate) FROM FeedBack WHERE `ON` = 'Session' AND SessionID = NEW.SessionID) -- Added backticks here
        WHERE SessionID = NEW.SessionID;
    END IF;
END$$

DELIMITER ;

-- trigger to get feedback rating by admin
DELIMITER //

CREATE PROCEDURE GetFeedbackByIdAdmin(
    IN p_feedback_id INT
)
BEGIN
    SELECT 
        fb.FeedbackID, fb.CustomerID, fb.Content, fb.Title, 
        fb.ON, fb.Rate, fb.CourtID, fb.SessionID, fb.OrderID,
        c.Name AS CustomerName,
        ct.Type AS CourtType, -- For Court feedback
        ts.Type AS SessionType, ts.StartDate AS SessionStartDate -- For Session feedback
    FROM FeedBack fb
    LEFT JOIN Customer c ON fb.CustomerID = c.CustomerID
    LEFT JOIN Court ct ON fb.CourtID = ct.Court_ID AND fb.ON = 'Court'
    LEFT JOIN Training_Session ts ON fb.SessionID = ts.SessionID AND fb.ON = 'Session'
    WHERE fb.FeedbackID = p_feedback_id;
END //

DELIMITER ;

DELIMITER //

CREATE FUNCTION GetCustomerCount()
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE customerCount INT;
    
    SELECT COUNT(*) INTO customerCount
    FROM Customer c
    JOIN User u ON c.Username = u.Username
    WHERE u.UserType = 'Customer';
    
    RETURN customerCount;
END //

DELIMITER ;