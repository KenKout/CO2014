# Badminton Center Management System

A comprehensive FastAPI-based application for managing badminton center operations, including court bookings, customer management, equipment rentals, training sessions, and more.

## Features

- **Court Management**: Track court availability, types, and hourly rates
- **Booking System**: Allow customers to book courts for specific time slots
- **User Management**: Handle different user types (customers, staff, coaches)
- **Equipment Rental**: Manage equipment inventory and rentals
- **Training Sessions**: Schedule and manage training sessions with coaches
- **Payment Processing**: Track payments for various services
- **Cafeteria Orders**: Handle food orders from the cafeteria
- **Feedback System**: Collect and manage customer feedback

## Project Structure

```
.
├── .env.example           # Example environment variables
├── .gitignore             # Git ignore file
├── README.md              # This file
├── requirements.txt       # Python dependencies
└── app/                   # Main application directory
    ├── __init__.py        # Package initialization
    ├── database.py        # Database connection and session management
    ├── env.py             # Environment configuration
    ├── main.py            # FastAPI application entry point
    ├── models/            # SQLAlchemy ORM models
    │   ├── __init__.py    # Models initialization
    │   ├── booking.py     # Court booking model
    │   ├── cafeteriafood.py # Food items model
    │   ├── coach.py       # Coach model
    │   ├── court.py       # Court model
    │   ├── create_tables.py # Database table creation
    │   ├── customer.py    # Customer model
    │   ├── enroll.py      # Training enrollment model
    │   ├── equipment.py   # Equipment model
    │   ├── feedback.py    # Customer feedback model
    │   ├── order.py       # Order model
    │   ├── orderdetails.py # Order details model
    │   ├── orderfood.py   # Food order model
    │   ├── payment.py     # Payment model
    │   ├── rent.py        # Equipment rental model
    │   ├── staff.py       # Staff model
    │   ├── training_session.py # Training session model
    │   ├── trainingschedule.py # Training schedule model
    │   └── user.py        # User authentication model
    └── routers/           # API route definitions
        ├── __init__.py    # Routers initialization
        └── v1/            # API version 1
            ├── __init__.py # V1 initialization
            └── demo.py    # Demo endpoints
```

## Getting Started

### Prerequisites

- Python 3.8+
- MySQL or compatible database
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone https://gitlab.thenduy.com/root/co2014.git
   cd co2014
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your specific configuration.

5. Run the application:
   ```bash
   python -m app.main
   ```

The API will be available at http://localhost:8000 by default.

### API Documentation

Once the application is running, you can access:

- Interactive API documentation: http://localhost:8000/docs
- Alternative documentation: http://localhost:8000/redoc
- OpenAPI schema: http://localhost:8000/openapi.json

## Development

Each directory contains its own README.md with detailed information:

- [app/](app/README.md) - Main application directory
- [app/models/](app/models/README.md) - Database models
- [app/routers/](app/routers/README.md) - API routers
- [app/routers/v1/](app/routers/v1/README.md) - API version 1 endpoints

## Database Setup

The application uses SQLAlchemy ORM with a connection defined in `database.py`. The database URL should be specified in the `.env` file:

```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/dbname
```

The database tables will be automatically created when the application starts.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Merge Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
