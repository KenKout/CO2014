CREATE TABLE `User` (
  `Username` VARCHAR(100) PRIMARY KEY,
  `Password` VARCHAR(100) NOT NULL,
  `Phone` VARCHAR(10),
  `UserType` ENUM('Customer', 'Staff'),
  `JoinDate` TIMESTAMP
);

CREATE TABLE `Customer` (
  `CustomerID` INT PRIMARY KEY AUTO_INCREMENT,
  `Name` VARCHAR(100),
  `Date_of_Birth` TIMESTAMP,
  `Username` VARCHAR(100),
  FOREIGN KEY (`Username`) REFERENCES `User`(`Username`)
);

CREATE TABLE `Staff` (
  `StaffID` INT PRIMARY KEY AUTO_INCREMENT,
  `Username` VARCHAR(100),
  `Name` VARCHAR(100),
  `Salary` INT,
  FOREIGN KEY (`Username`) REFERENCES `User`(`Username`)
);

CREATE TABLE `Coach` (
  `Description` TEXT,
  `url` TEXT,
  `StaffID` INT,
  FOREIGN KEY (`StaffID`) REFERENCES `Staff`(`StaffID`)
);

CREATE TABLE `Court` (
  `Court_ID` INT PRIMARY KEY,
  `Status` ENUM('Available', 'Booked'),
  `HourRate` INT,
  `Type` ENUM('Normal', 'Air-conditioner')
);

CREATE TABLE `OrderTable` (
  `OrderID` INT PRIMARY KEY,
  `OrderDate` TIMESTAMP,
  `TotalAmount` INT,
  `CustomerID` INT,
  FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`)
);

CREATE TABLE `Booking` (
  `BookingID` INT PRIMARY KEY,
  `CustomerID` INT,
  `CourtID` INT,
  `StartTime` TIMESTAMP,
  `EndTime` TIMESTAMP,
  `Status` ENUM('Pending', 'Success', 'Cancel'),
  `TotalPrice` INT,
  `OrderID` INT,
  FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
  FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
  FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`)
);

CREATE TABLE `Payment` (
  `PaymentID` INT PRIMARY KEY,
  `OrderID` INT,
  `Total` INT,
  `Customer_ID` INT,
  `Method` ENUM('Credit Card', 'Cash'),
  `Time` TIMESTAMP,
  FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
  FOREIGN KEY (`Customer_ID`) REFERENCES `Customer`(`CustomerID`)
);

CREATE TABLE `Training_Session` (
  `SessionID` INT PRIMARY KEY,
  `StartDate` TIMESTAMP,
  `EndDate` TIMESTAMP,
  `CoachID` INT,
  `CourtID` INT,
  `CustomerID` INT,
  `OrderID` INT,
  `Schedule` VARCHAR(255),
  `Type` ENUM('Beginner', 'Intermediate', 'Advanced'),
  `Price` INT,
  `Max_Students` INT,
  `Status` ENUM('Available', 'Unavailable'),
  `Rating` DECIMAL(2,1),
  FOREIGN KEY (`CoachID`) REFERENCES `Coach`(`StaffID`),
  FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
  FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
  FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`)
);

CREATE TABLE `FeedBack` (
  `CustomerID` INT,
  `Content` VARCHAR(255),
  `Title` VARCHAR(255),
  `FeedbackID` INT PRIMARY KEY,
  `ON_Type` ENUM('Court', 'Session'),
  `Rate` INT,
  `CourtID` INT,
  `SessionID` INT,
  FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
  FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
  FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`)
);

CREATE TABLE `CafeteriaFood` (
  `FoodID` INT PRIMARY KEY,
  `Stock` INT,
  `Name` VARCHAR(255),
  `Category` ENUM('Snack', 'Meal', 'Drink'),
  `Price` INT,
  `url` TEXT
);

CREATE TABLE `Equipment` (
  `EquipmentID` INT PRIMARY KEY,
  `Price` INT,
  `Type` ENUM('Racket', 'Shuttlecock', 'Shoes'),
  `Stock` INT,
  `Name` VARCHAR(255),
  `Brand` VARCHAR(100),
  `url` TEXT
);

CREATE TABLE `Enroll` (
  `CustomerID` INT,
  `SessionID` INT,
  FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
  FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`),
  PRIMARY KEY (`CustomerID`, `SessionID`)
);

CREATE TABLE `TrainingSchedule` (
  `SessionID` INT,
  `CourtID` INT,
  `StartTime` TIMESTAMP,
  `EndTime` TIMESTAMP,
  `DayUse` TIMESTAMP,
  FOREIGN KEY (`SessionID`) REFERENCES `Training_Session`(`SessionID`),
  FOREIGN KEY (`CourtID`) REFERENCES `Court`(`Court_ID`),
  PRIMARY KEY (`SessionID`, `CourtID`, `StartTime`)
);

CREATE TABLE `Rent` (
  `OrderID` INT,
  `EquipmentID` INT,
  FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
  FOREIGN KEY (`EquipmentID`) REFERENCES `Equipment`(`EquipmentID`),
  PRIMARY KEY (`OrderID`, `EquipmentID`)
);

CREATE TABLE `OrderFood` (
  `OrderID` INT,
  `FoodID` INT,
  FOREIGN KEY (`OrderID`) REFERENCES `OrderTable`(`OrderID`),
  FOREIGN KEY (`FoodID`) REFERENCES `CafeteriaFood`(`FoodID`),
  PRIMARY KEY (`OrderID`, `FoodID`)
);