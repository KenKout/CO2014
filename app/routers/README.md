# API Routers

This directory contains the API routers for the Badminton Center Management System. The routers are organized by API version to allow for future API changes without breaking existing clients.

## Structure

- `__init__.py` - Makes the routers directory a Python package
- `v1/` - Version 1 of the API endpoints

## API Versioning

The API is versioned to ensure backward compatibility as the application evolves. Each version has its own subdirectory:

- `v1/` - The initial version of the API

When creating new API versions:

1. Create a new subdirectory (e.g., `v2/`)
2. Create an `__init__.py` file in the new directory
3. Implement new or modified endpoints
4. Register the new router in `app/main.py`

## Router Implementation

Each router is implemented as a FastAPI APIRouter. Here's an example of how routers are defined:

```python
from fastapi import APIRouter

router = APIRouter(
    prefix="/resource",
    tags=["Resource"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
async def get_resources():
    """Get all resources."""
    return {"resources": []}

@router.get("/{resource_id}")
async def get_resource(resource_id: int):
    """Get a specific resource by ID."""
    return {"resource_id": resource_id, "name": "Example Resource"}
```

## Adding New Routers

To add a new router:

1. Create a new Python file in the appropriate version directory
2. Define your APIRouter and endpoints
3. Import and include your router in `app/main.py`:

```python
from app.routers.v1.your_router import your_router

app.include_router(your_router, prefix="/v1")
```

## Best Practices

- Group related endpoints in the same router
- Use descriptive tags for API documentation
- Include comprehensive docstrings for each endpoint
- Define response models for consistent API responses
- Implement proper error handling with appropriate status codes
- Use dependency injection for database sessions and authentication