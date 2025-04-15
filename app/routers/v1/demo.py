from fastapi import APIRouter, HTTPException, status, Query, Path, Body
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

# Define models for request and response
class DemoItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True
    tags: List[str] = []
    

    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "name": "Example Item",
                "description": "This is an example item",
                "is_active": True,
                "tags": ["example", "demo"]
            }
        }
    
class DemoItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True
    tags: List[str] = []

class DemoItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None

# Create router
demo_router = APIRouter(
    prefix="/demo",
    tags=["Demo"],
    responses={404: {"description": "Not found"}},
)

# In-memory database for demo purposes
demo_items = {
    1: DemoItem(
        id=1,
        name="First Item",
        description="This is the first demo item",
        tags=["first", "demo"]
    ),
    2: DemoItem(
        id=2,
        name="Second Item",
        description="This is the second demo item",
        tags=["second", "demo"]
    )
}

# Get all items
@demo_router.get("/items", response_model=List[DemoItem])
async def get_items(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max number of items to return"),
    active_only: bool = Query(False, description="Filter only active items")
):
    """
    Retrieve all demo items with pagination and filtering options.
    """
    items = list(demo_items.values())
    
    if active_only:
        items = [item for item in items if item.is_active]
    
    return items[skip:skip + limit]

# Get item by ID
@demo_router.get("/items/{item_id}", response_model=DemoItem)
async def get_item(
    item_id: int = Path(..., ge=1, description="The ID of the item to retrieve")
):
    """
    Retrieve a specific demo item by its ID.
    """
    if item_id not in demo_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    return demo_items[item_id]

# Create new item
@demo_router.post("/items", response_model=DemoItem, status_code=status.HTTP_201_CREATED)
async def create_item(item: DemoItemCreate = Body(...)):
    """
    Create a new demo item.
    """
    # Generate a new ID (in a real app, this would be handled by the database)
    new_id = max(demo_items.keys()) + 1 if demo_items else 1
    
    # Create new item
    new_item = DemoItem(
        id=new_id,
        name=item.name,
        description=item.description,
        is_active=item.is_active,
        tags=item.tags
    )
    
    # Add to in-memory database
    demo_items[new_id] = new_item
    
    return new_item

# Update item
@demo_router.patch("/items/{item_id}", response_model=DemoItem)
async def update_item(
    item_id: int = Path(..., ge=1, description="The ID of the item to update"),
    item_update: DemoItemUpdate = Body(...)
):
    """
    Update an existing demo item.
    """
    if item_id not in demo_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    
    # Get existing item
    existing_item = demo_items[item_id]
    
    # Update fields if provided
    update_data = item_update.dict(exclude_unset=True)
    updated_item = existing_item.copy(update=update_data)
    
    # Save updated item
    demo_items[item_id] = updated_item
    
    return updated_item

# Delete item
@demo_router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int = Path(..., ge=1, description="The ID of the item to delete")
):
    """
    Delete a demo item.
    """
    if item_id not in demo_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    
    # Remove from in-memory database
    del demo_items[item_id]
    
    return None

# Search items by tag
@demo_router.get("/search", response_model=List[DemoItem])
async def search_items(
    tag: str = Query(..., min_length=1, description="Tag to search for")
):
    """
    Search for demo items by tag.
    """
    matching_items = [
        item for item in demo_items.values()
        if tag.lower() in [t.lower() for t in item.tags]
    ]
    
    return matching_items