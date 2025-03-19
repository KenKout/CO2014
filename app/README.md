# Badminton Center Management System

This is the main application directory for the Badminton Center Management System, a FastAPI-based application for managing a badminton center's operations.

## Project Structure

- `__init__.py` - Makes the app directory a Python package
- `database.py` - Database connection and session management
- `env.py` - Environment variable configuration
- `main.py` - FastAPI application entry point
- `models/` - SQLAlchemy ORM models for database tables
- `routers/` - API route definitions organized by version

## Getting Started

### Prerequisites

- Python 3.8+
- MySQL or compatible database
- Required Python packages (see requirements.txt in the root directory)

### Environment Setup

1. Copy the `.env.example` file to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific configuration:
   - Database connection details
   - API settings
   - JWT secret key
   - SMTP settings for email functionality

### Running the Application

From the project root directory:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python -m app.main
```

The API will be available at http://localhost:8000 by default.

## API Documentation

Once the application is running, you can access:

- Interactive API documentation: http://localhost:8000/docs
- Alternative documentation: http://localhost:8000/redoc
- OpenAPI schema: http://localhost:8000/openapi.json

## Database Configuration

The application uses SQLAlchemy ORM with a connection defined in `database.py`. The database URL should be specified in the `.env` file:

```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/dbname
```

## Authentication

The application uses JWT (JSON Web Tokens) for authentication. Configure the JWT settings in the `.env` file:

```
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_MINUTES=10080
```

## Email Functionality

For features requiring email sending, configure the SMTP settings in the `.env` file:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password