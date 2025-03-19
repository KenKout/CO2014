# API Version 1 (v1)

This directory contains the Version 1 API endpoints for the Badminton Center Management System.

## Structure

- `__init__.py` - Makes the v1 directory a Python package
- `demo.py` - Demo endpoints showcasing API functionality

## Available Endpoints

### Demo Endpoints

The demo endpoints provide examples of RESTful API implementation and can be used as templates for implementing other endpoints.

- `GET /v1/demo/items` - List all demo items with pagination and filtering
- `GET /v1/demo/items/{item_id}` - Get a specific demo item by ID
- `POST /v1/demo/items` - Create a new demo item
- `PATCH /v1/demo/items/{item_id}` - Update an existing demo item
- `DELETE /v1/demo/items/{item_id}` - Delete a demo item
- `GET /v1/demo/search` - Search for demo items by tag

## Implementing New Endpoints

When implementing new endpoints for the badminton center, follow these guidelines:

1. Create a new file for each resource (e.g., `courts.py`, `bookings.py`, etc.)
2. Define Pydantic models for request and response validation
3. Create an APIRouter with appropriate prefix and tags
4. Implement CRUD operations and any specialized endpoints
5. Include the router in `app/main.py`

## Example Implementation

Here's a simplified example of how to implement a new endpoint file:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Court
from pydantic import BaseModel

# Pydantic models
class CourtBase(BaseModel):
    name: str
    court_type: str
    hour_rate: float
    
class CourtCreate(CourtBase):
    pass
    
class CourtResponse(CourtBase):
    id: int
    is_available: bool
    
    class Config:
        orm_mode = True

# Create router
court_router = APIRouter(
    prefix="/courts",
    tags=["Courts"],
    responses={404: {"description": "Not found"}},
)

@court_router.get("/", response_model=List[CourtResponse])
def get_courts(db: Session = Depends(get_db)):
    """Get all courts"""
    return db.query(Court).all()

# Add more endpoints as needed
```

Then include this router in `app/main.py`:

```python
from app.routers.v1.courts import court_router

app.include_router(court_router, prefix="/v1")
```

## API Documentation

All endpoints should include proper docstrings and response models to ensure they are well-documented in the Swagger UI and ReDoc interfaces.