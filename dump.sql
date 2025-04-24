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
    `Court_ID` INT PRIMARY KEY,
    `Status` ENUM('Available', 'Booked'),
    `HourRate` INT,
    `Type` ENUM('Normal', 'Air-conditioner')
);

-- Training Session Table
CREATE TABLE `Training_Session` (
    `SessionID` INT PRIMARY KEY,
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
    `Time` DATETIME,
    FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
    FOREIGN KEY (`Customer_ID`) REFERENCES `Customer`(`CustomerID`)
);

-- CafeteriaFood Table
CREATE TABLE `CafeteriaFood` (
    `FoodID` INT PRIMARY KEY,
    `Stock` INT,
    `Name` VARCHAR(255),
    `Category` ENUM('Snack', 'Meal', 'Drink'),
    `Price` INT,
    `url` TEXT
);

-- Equipment Table
CREATE TABLE `Equipment` (
    `EquipmentID` INT PRIMARY KEY,
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
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
    FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
    FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`)
);
